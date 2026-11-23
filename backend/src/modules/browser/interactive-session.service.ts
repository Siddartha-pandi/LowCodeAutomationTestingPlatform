import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
} from '@nestjs/common';
import { BrowserContext, Page } from 'playwright';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { BrowserManagerService } from './browser-manager.service';
import {
  ActionDto,
  DomExploreDto,
  LaunchSessionDto,
  NavigateDto,
  RecordActionDto,
  SaveRecordingDto,
  ScreenshotDto,
  StartRecorderDto,
  TestSelectorDto,
} from './dto/browser.dto';
import { AutomationDefinitionEntity } from '../../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../../database/entities/definition-version.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { computeDefinitionChecksum } from '../flows/flow-checksum';

interface ActiveSession {
  sessionId: string;
  projectId?: string;
  userId: string;
  context: BrowserContext;
  page: Page;
  allowedDomains: string[];
  createdAt: Date;
  lastActiveAt: Date;
  recordingActions: any[];
}

@Injectable()
export class InteractiveSessionService implements OnApplicationShutdown {
  private readonly logger = new Logger(InteractiveSessionService.name);
  private readonly sessions = new Map<string, ActiveSession>();

  constructor(
    private readonly browserManager: BrowserManagerService,
    @InjectRepository(AutomationDefinitionEntity)
    private readonly definitionRepository: Repository<AutomationDefinitionEntity>,
    @InjectRepository(DefinitionVersionEntity)
    private readonly versionRepository: Repository<DefinitionVersionEntity>,
  ) {}

  async launchSession(dto: LaunchSessionDto, userId: string): Promise<any> {
    const sessionId = dto.session_id || `sess_${crypto.randomUUID().replace(/-/g, '')}`;

    const browser = await this.browserManager.getBrowser('chromium', true);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    const allowedDomains = dto.allowed_domains || ['*'];

    // Setup network policy if domains are restricted
    if (!allowedDomains.includes('*')) {
      await page.route('**/*', (route) => {
        try {
          const url = new URL(route.request().url());
          const hostname = url.hostname.toLowerCase();
          const isAllowed = allowedDomains.some((d) => {
            const cleanD = d.toLowerCase().trim();
            if (cleanD.startsWith('*.')) {
              return hostname.endsWith(cleanD.slice(2)) || hostname === cleanD.slice(2);
            }
            return hostname === cleanD;
          });
          if (isAllowed || route.request().resourceType() === 'document') {
            route.continue();
          } else {
            route.abort();
          }
        } catch {
          route.continue();
        }
      });
    }

    const session: ActiveSession = {
      sessionId,
      projectId: dto.project_id,
      userId,
      context,
      page,
      allowedDomains,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      recordingActions: [],
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`Launched interactive Playwright session: ${sessionId}`);

    return {
      session_id: sessionId,
      status: 'ready',
      allowed_domains: allowedDomains,
      created_at: session.createdAt.toISOString(),
    };
  }

  async navigateSession(dto: NavigateDto, userId: string, isSuperuser = false): Promise<any> {
    const session = this.getVerifiedSession(dto.session_id, userId, isSuperuser);
    session.lastActiveAt = new Date();

    const timeoutMs = (dto.timeout || 30) * 1000;
    let url = dto.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    await session.page.goto(url, { timeout: timeoutMs, waitUntil: 'load' });

    const screenshotBuffer = await session.page.screenshot({ fullPage: false });
    const imageBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

    return {
      success: true,
      session_id: session.sessionId,
      url: session.page.url(),
      title: await session.page.title(),
      image_base64: imageBase64,
    };
  }

  async executeAction(dto: ActionDto, userId: string, isSuperuser = false): Promise<any> {
    const session = this.getVerifiedSession(dto.session_id, userId, isSuperuser);
    session.lastActiveAt = new Date();

    const action = dto.action.toLowerCase().trim();
    const selector = (dto.selector || '').trim();
    const timeoutMs = (dto.timeout || 15) * 1000;
    const page = session.page;

    switch (action) {
      case 'click':
        if (selector) {
          await page.click(selector, { timeout: timeoutMs });
        } else if (dto.x !== undefined && dto.y !== undefined) {
          await page.mouse.click(dto.x, dto.y);
        } else {
          throw new BadRequestException('Selector or coordinates (x, y) required for click action');
        }
        break;
      case 'click_at':
      case 'mouse_click':
        if (dto.x !== undefined && dto.y !== undefined) {
          await page.mouse.click(dto.x, dto.y);
        } else {
          throw new BadRequestException('Coordinates (x, y) required for click_at action');
        }
        break;
      case 'dblclick':
      case 'double_click':
        if (selector) {
          await page.dblclick(selector, { timeout: timeoutMs });
        } else if (dto.x !== undefined && dto.y !== undefined) {
          await page.mouse.dblclick(dto.x, dto.y);
        }
        break;
      case 'fill': {
        const fillText = dto.text !== '' ? dto.text : dto.value || '';
        const isValidSelector = selector && selector !== 'viewport' && !selector.startsWith('(');
        let filled = false;

        if (isValidSelector) {
          try {
            await page.fill(selector, fillText, { timeout: timeoutMs });
            filled = true;
          } catch {
            filled = false;
          }
        }

        if (!filled) {
          if (dto.x !== undefined && dto.y !== undefined) {
            await page.mouse.click(dto.x, dto.y);
            await page.keyboard.press('ControlOrMeta+A');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(fillText);
          } else if (isValidSelector) {
            // Retry clicking selector first
            await page.click(selector, { timeout: timeoutMs });
            await page.keyboard.press('ControlOrMeta+A');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(fillText);
          } else {
            await page.keyboard.type(fillText);
          }
        }
        break;
      }
      case 'type': {
        const typeText = dto.text !== '' ? dto.text : dto.value || '';
        const isValidSelector = selector && selector !== 'viewport' && !selector.startsWith('(');
        if (isValidSelector) {
          try {
            await page.type(selector, typeText, { timeout: timeoutMs });
          } catch {
            if (dto.x !== undefined && dto.y !== undefined) {
              await page.mouse.click(dto.x, dto.y);
              await page.keyboard.type(typeText);
            } else {
              await page.keyboard.type(typeText);
            }
          }
        } else if (dto.x !== undefined && dto.y !== undefined) {
          await page.mouse.click(dto.x, dto.y);
          await page.keyboard.type(typeText);
        } else {
          await page.keyboard.type(typeText);
        }
        break;
      }
      case 'press':
      case 'press_key':
      case 'keyboard_press': {
        const key = dto.value || dto.text || 'Enter';
        await page.keyboard.press(key);
        break;
      }
      case 'select': {
        const selVal = dto.value || dto.text || '';
        await page.selectOption(selector, selVal, { timeout: timeoutMs });
        break;
      }
      case 'check':
        await page.check(selector, { timeout: timeoutMs });
        break;
      case 'uncheck':
        await page.uncheck(selector, { timeout: timeoutMs });
        break;
      case 'scroll': {
        const delta = Number(dto.value) || 400;
        try {
          await page.mouse.wheel(0, delta);
        } catch {}
        await page.evaluate((y) => window.scrollBy(0, y), delta);
        break;
      }
      default:
        throw new BadRequestException(`Unsupported browser action '${action}'`);
    }

    const screenshotBuffer = await page.screenshot({ fullPage: false });
    const imageBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

    return {
      success: true,
      action,
      selector,
      current_url: page.url(),
      image_base64: imageBase64,
    };
  }

  async captureScreenshot(dto: ScreenshotDto, userId: string, isSuperuser = false): Promise<any> {
    const session = this.getVerifiedSession(dto.session_id, userId, isSuperuser);
    session.lastActiveAt = new Date();

    const screenshotBuffer = await session.page.screenshot({ fullPage: dto.full_page ?? false });
    const sha256 = crypto.createHash('sha256').update(screenshotBuffer).digest('hex');
    const imageBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

    return {
      success: true,
      session_id: session.sessionId,
      file_size: screenshotBuffer.length,
      sha256,
      image_base64: imageBase64,
    };
  }

  async getViewport(sessionId: string, userId: string, isSuperuser = false): Promise<any> {
    const session = this.getVerifiedSession(sessionId, userId, isSuperuser);
    session.lastActiveAt = new Date();

    const screenshotBuffer = await session.page.screenshot({ fullPage: false });
    const imageBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

    return {
      success: true,
      session_id: sessionId,
      image_base64: imageBase64,
      captured_at: new Date().toISOString(),
    };
  }

  async closeSession(sessionId: string, userId: string, isSuperuser = false): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { session_id: sessionId, status: 'closed' };
    }

    if (!isSuperuser && session.userId !== userId) {
      throw new ForbiddenException('Access denied to browser session');
    }

    try {
      await session.context.close();
    } catch (err: any) {
      this.logger.debug(`Error closing browser context: ${err.message}`);
    }

    this.sessions.delete(sessionId);
    return { session_id: sessionId, status: 'closed' };
  }

  validateSelector(selector: string): any {
    const sel = (selector || '').trim();
    if (!sel) {
      return {
        raw_selector: sel,
        is_valid: false,
        error_message: 'Selector cannot be empty',
      };
    }

    let selectorType = 'css';
    if (sel.startsWith('//') || sel.startsWith('(') || sel.startsWith('./')) {
      selectorType = 'xpath';
    } else if (sel.startsWith('text=')) {
      selectorType = 'text';
    } else if (sel.startsWith('role=')) {
      selectorType = 'role';
    } else if (sel.includes('data-testid') || sel.includes('data-test')) {
      selectorType = 'data_attribute';
    } else if (sel.startsWith('#')) {
      selectorType = 'id';
    }

    return {
      raw_selector: sel,
      is_valid: true,
      error_message: null,
      selector_type: selectorType,
      normalized_selector: sel,
      role_name: null,
      role_options: {},
      text_content: null,
      exact_match: false,
    };
  }

  async testSelector(dto: TestSelectorDto, userId: string, isSuperuser = false): Promise<any> {
    const session = this.getVerifiedSession(dto.session_id, userId, isSuperuser);
    session.lastActiveAt = new Date();

    const selector = dto.selector.trim();
    const locator = session.page.locator(selector);

    let count = 0;
    let isVisible = false;
    let isEnabled = false;
    let box = null;
    let text = '';
    let imageBase64 = null;

    try {
      count = await locator.count();
      if (count > 0) {
        isVisible = await locator.first().isVisible().catch(() => false);
        isEnabled = await locator.first().isEnabled().catch(() => false);
        box = await locator.first().boundingBox().catch(() => null);
        text = await locator.first().innerText().catch(() => '');

        if (dto.highlight && isVisible) {
          await locator.first().highlight().catch(() => {});
        }
      }
    } catch (err: any) {
      this.logger.debug(`Selector evaluation failed: ${err.message}`);
    }

    try {
      const shot = await session.page.screenshot({ fullPage: false });
      imageBase64 = `data:image/png;base64,${shot.toString('base64')}`;
    } catch {}

    return {
      found: count > 0,
      count,
      is_visible: isVisible,
      is_enabled: isEnabled,
      text,
      box,
      resolved_selector: selector,
      tier: 'primary',
      attempted_selectors: [selector],
      healed: false,
      warning: null,
      image_base64: imageBase64,
    };
  }

  // ---------------------------------------------------------------------------
  // Recorder Endpoints
  // ---------------------------------------------------------------------------

  async startRecorder(dto: StartRecorderDto, userId: string): Promise<any> {
    const sessionId = `rec_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

    let targetUrl = dto.target_url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    const browser = await this.browserManager.getBrowser('chromium', true);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    await page.goto(targetUrl, { timeout: 45000, waitUntil: 'load' });

    const shot = await page.screenshot({ fullPage: false });
    const imageBase64 = `data:image/png;base64,${shot.toString('base64')}`;

    const session: ActiveSession = {
      sessionId,
      projectId: dto.project_id,
      userId,
      context,
      page,
      allowedDomains: ['*'],
      createdAt: new Date(),
      lastActiveAt: new Date(),
      recordingActions: [
        {
          id: `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
          action: 'navigate',
          selector: targetUrl,
          value: null,
          timestamp: new Date().toISOString(),
          status: 'verified',
        },
      ],
    };

    this.sessions.set(sessionId, session);

    return {
      session_id: sessionId,
      status: 'recording',
      initial_url: targetUrl,
      actions_recorded: 1,
      image_base64: imageBase64,
      created_at: session.createdAt.toISOString(),
    };
  }

  async recordAction(dto: RecordActionDto, userId: string, isSuperuser = false): Promise<any> {
    const session = this.getVerifiedSession(dto.session_id, userId, isSuperuser);
    session.lastActiveAt = new Date();

    const action = dto.action.toLowerCase().trim();
    const selector = (dto.selector || '').trim();

    // Execute the action in the real browser
    let resolvedSelector = selector;
    let elementInfo: any = null;
    if (action !== 'navigate') {
      if ((!selector || selector === 'viewport') && dto.x !== undefined && dto.y !== undefined) {
        try {
          const inspected = await session.page.evaluate(({ px, py }) => {
            let el = document.elementFromPoint(px, py);
            if (!el) return null;

            // If user clicked a wrapper div or label, find the interactive input/textarea inside
            if (el.tagName.toLowerCase() !== 'input' && el.tagName.toLowerCase() !== 'textarea') {
              const innerInput = el.querySelector('input, textarea');
              if (innerInput) {
                el = innerInput;
              } else if (el.closest('label')?.querySelector('input, textarea')) {
                el = el.closest('label')!.querySelector('input, textarea')!;
              } else if (el.parentElement?.querySelector('input, textarea')) {
                const sib = el.parentElement.querySelector('input, textarea');
                if (sib) el = sib;
              }
            }

            const tag = el.tagName.toLowerCase();
            const isInput = tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;

            // Generate unique, deterministic selector
            let sel = '';
            const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-cy');
            if (testId) {
              sel = `[data-testid="${testId}"]`;
            } else if (el.id) {
              sel = `#${CSS.escape(el.id)}`;
            } else if (el.getAttribute('name')) {
              sel = `${tag}[name="${el.getAttribute('name')}"]`;
            } else if (el.getAttribute('placeholder')) {
              sel = `${tag}[placeholder="${el.getAttribute('placeholder')}"]`;
            } else if (el.getAttribute('aria-label')) {
              sel = `${tag}[aria-label="${el.getAttribute('aria-label')}"]`;
            } else if (el.getAttribute('type') && tag === 'input') {
              const byType = `input[type="${el.getAttribute('type')}"]`;
              if (document.querySelectorAll(byType).length === 1) {
                sel = byType;
              }
            }

            // Path-based unique selector if single attribute isn't unique
            if (!sel || document.querySelectorAll(sel).length > 1) {
              const path: string[] = [];
              let current: Element | null = el;
              while (current && current !== document.body && current.nodeType === Node.ELEMENT_NODE) {
                let part = current.tagName.toLowerCase();
                if (current.id) {
                  path.unshift(`#${CSS.escape(current.id)}`);
                  break;
                }
                const cName = current.getAttribute('name');
                if (cName) {
                  part += `[name="${cName}"]`;
                } else {
                  let sibling = current;
                  let nth = 1;
                  while ((sibling = sibling.previousElementSibling as any)) {
                    if (sibling.tagName.toLowerCase() === current.tagName.toLowerCase()) nth++;
                  }
                  part += `:nth-of-type(${nth})`;
                }
                path.unshift(part);
                current = current.parentElement;
              }
              sel = path.join(' > ');
            }

            return {
              selector: sel,
              tag,
              isInput,
              type: el.getAttribute('type') || 'text',
              placeholder: el.getAttribute('placeholder') || '',
              value: (el as HTMLInputElement).value || '',
            };
          }, { px: dto.x, py: dto.y });
          if (inspected?.selector) {
            resolvedSelector = inspected.selector;
            elementInfo = inspected;
          } else {
            resolvedSelector = `(${dto.x}, ${dto.y})`;
          }
        } catch {
          resolvedSelector = `(${dto.x}, ${dto.y})`;
        }
      }

      await this.executeAction(
        {
          session_id: dto.session_id,
          action,
          selector: resolvedSelector,
          value: dto.value,
          text: dto.value,
          x: dto.x,
          y: dto.y,
        },
        userId,
        isSuperuser,
      );
    } else if (selector) {
      await session.page.goto(selector, { timeout: 30000 });
    }

    const recordEntry = {
      id: `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
      action: action === 'click_at' ? 'click' : action,
      selector: resolvedSelector,
      value: dto.value || null,
      timestamp: new Date().toISOString(),
      status: 'verified',
    };

    session.recordingActions.push(recordEntry);

    const shot = await session.page.screenshot({ fullPage: false });
    const imageBase64 = `data:image/png;base64,${shot.toString('base64')}`;

    return {
      session_id: session.sessionId,
      recorded_action: recordEntry,
      total_actions: session.recordingActions.length,
      image_base64: imageBase64,
      element_info: elementInfo,
    };
  }

  getRecorderStatus(sessionId?: string, userId?: string): any {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return { is_recording: false, session_id: sessionId, total_actions: 0, actions: [] };
      }
      return {
        is_recording: true,
        session_id: session.sessionId,
        project_id: session.projectId,
        total_actions: session.recordingActions.length,
        actions: session.recordingActions,
      };
    }

    const activeList = Array.from(this.sessions.values()).map((s) => ({
      session_id: s.sessionId,
      project_id: s.projectId,
      total_actions: s.recordingActions.length,
      created_at: s.createdAt.toISOString(),
    }));

    return { active_recordings: activeList, count: activeList.length };
  }

  async inspectElement(sessionId: string, userId: string, isSuperuser = false): Promise<any> {
    const session = this.getVerifiedSession(sessionId, userId, isSuperuser);
    const elements = await session.page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"]'),
      );
      return nodes.slice(0, 50).map((el: any) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || null,
          text: (el.innerText || el.value || '').trim().slice(0, 50),
          selector: el.id
            ? `#${el.id}`
            : el.getAttribute('data-testid')
            ? `[data-testid="${el.getAttribute('data-testid')}"]`
            : el.tagName.toLowerCase(),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
    });

    return { session_id: sessionId, total: elements.length, elements };
  }

  async saveRecording(dto: SaveRecordingDto, userId: string, isSuperuser = false): Promise<any> {
    const session = this.getVerifiedSession(dto.session_id, userId, isSuperuser);
    const targetType = dto.target_type || 'test';

    let steps = session.recordingActions.map((act) => {
      if (act.action === 'navigate') {
        return { action: 'navigate', target: { url: act.selector } };
      }
      return {
        action: act.action,
        target: { selector: act.selector },
        value: act.value,
      };
    });

    let definitionContent: any;
    if (targetType === 'test') {
      definitionContent = {
        name: dto.name,
        setup_steps: [],
        steps,
        teardown_steps: [],
      };
    } else {
      const nodes: any[] = [
        {
          id: 'node-start',
          type: 'start',
          action: 'start',
          position: { x: 280, y: 50 },
          config: {},
        },
      ];
      const edges: any[] = [];
      let prevId = 'node-start';

      steps.forEach((s, i) => {
        const id = `node-step-${i + 1}`;
        const yPos = 50 + (i + 1) * 110;
        const selector = s.target?.selector || (s.action === 'navigate' ? undefined : (typeof s.target === 'string' ? s.target : ''));
        const url = s.action === 'navigate' ? (s.target?.url || s.target?.selector || (typeof s.target === 'string' ? s.target : undefined)) : undefined;
        nodes.push({
          id,
          type: 'action',
          action: s.action,
          position: { x: 280, y: yPos },
          config: {
            target: s.target,
            selector: selector || undefined,
            url: url || undefined,
            value: s.value,
            value_template: s.value,
            text: s.action === 'type' || s.action === 'keyboard_type' ? s.value : undefined,
            key: s.action === 'press_key' ? (s.value || 'Enter') : undefined,
          },
        });
        edges.push({ id: `e_${prevId}_${id}`, source: prevId, target: id });
        prevId = id;
      });

      const endYPos = 50 + (steps.length + 1) * 110;
      nodes.push({
        id: 'node-end',
        type: 'stop',
        action: 'stop',
        position: { x: 280, y: endYPos },
        config: {},
      });
      edges.push({ id: `e_${prevId}_end`, source: prevId, target: 'node-end' });
      definitionContent = { nodes, edges };
    }

    const checksum = computeDefinitionChecksum(definitionContent);

    const definition = this.definitionRepository.create({
      projectId: dto.project_id,
      name: dto.name,
      description: dto.description || `Generated by Browser Recorder from session ${session.sessionId}`,
      type: targetType,
      status: 'published',
      createdBy: userId,
    });
    const savedDef = await this.definitionRepository.save(definition);

    const version = this.versionRepository.create({
      definitionId: savedDef.id,
      versionNum: 1,
      definitionJson: definitionContent,
      checksumSha256: checksum,
      isPublished: true,
      publishedBy: userId,
      publishedAt: new Date(),
    });
    const savedVersion = await this.versionRepository.save(version);

    savedDef.currentVersionId = savedVersion.id;
    await this.definitionRepository.save(savedDef);

    return {
      status: 'saved',
      id: savedDef.id,
      name: savedDef.name,
      type: savedDef.type,
      steps_count: steps.length,
      version_id: savedVersion.id,
    };
  }

  async stopRecorder(sessionId: string, userId: string, isSuperuser = false): Promise<any> {
    const session = this.getVerifiedSession(sessionId, userId, isSuperuser);
    const actions = [...session.recordingActions];
    await this.closeSession(sessionId, userId, isSuperuser);

    return {
      session_id: sessionId,
      status: 'stopped',
      total_actions: actions.length,
      actions,
    };
  }

  // ---------------------------------------------------------------------------
  // DOM Explorer Endpoints
  // ---------------------------------------------------------------------------

  async exploreDom(dto: DomExploreDto, userId: string): Promise<any> {
    let url = dto.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    const browser = await this.browserManager.getBrowser('chromium', true);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    try {
      await page.goto(url, { timeout: 30000, waitUntil: 'load' });

      const shot = await page.screenshot({ fullPage: false });
      const imageBase64 = `data:image/png;base64,${shot.toString('base64')}`;

      const elements = await page.evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll('a, button, input, select, textarea, [role]'),
        );
        return nodes.slice(0, 100).map((el: any) => ({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || null,
          text: (el.innerText || el.value || '').trim().slice(0, 60),
          role: el.getAttribute('role') || null,
          type: el.getAttribute('type') || null,
          selector: el.id
            ? `#${el.id}`
            : el.getAttribute('data-testid')
            ? `[data-testid="${el.getAttribute('data-testid')}"]`
            : el.tagName.toLowerCase(),
        }));
      });

      return {
        url: page.url(),
        title: await page.title(),
        total_elements: elements.length,
        elements,
        image_base64: imageBase64,
      };
    } finally {
      await context.close().catch(() => {});
    }
  }

  async onApplicationShutdown() {
    this.logger.log(`Closing ${this.sessions.size} interactive browser sessions on shutdown...`);
    for (const [id, session] of this.sessions.entries()) {
      try {
        await session.context.close();
      } catch {}
    }
    this.sessions.clear();
  }

  private getVerifiedSession(sessionId: string, userId: string, isSuperuser: boolean): ActiveSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Browser session '${sessionId}' not found or has expired`);
    }

    if (!isSuperuser && session.userId !== userId) {
      throw new ForbiddenException(`Access denied to browser session '${sessionId}'`);
    }

    return session;
  }
}
