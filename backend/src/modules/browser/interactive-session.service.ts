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
        await page.click(selector, { timeout: timeoutMs });
        break;
      case 'dblclick':
      case 'double_click':
        await page.dblclick(selector, { timeout: timeoutMs });
        break;
      case 'fill': {
        const fillText = dto.text !== '' ? dto.text : dto.value || '';
        await page.fill(selector, fillText, { timeout: timeoutMs });
        break;
      }
      case 'type': {
        const typeText = dto.text !== '' ? dto.text : dto.value || '';
        await page.type(selector, typeText, { timeout: timeoutMs });
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
      case 'scroll':
        await page.evaluate(() => window.scrollBy(0, 400));
        break;
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
    if (action !== 'navigate') {
      await this.executeAction(
        {
          session_id: dto.session_id,
          action,
          selector,
          value: dto.value,
          text: dto.value,
        },
        userId,
        isSuperuser,
      );
    } else if (selector) {
      await session.page.goto(selector, { timeout: 30000 });
    }

    const recordEntry = {
      id: `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
      action,
      selector,
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
      const nodes: any[] = [{ id: 'node-start', type: 'start', config: {} }];
      const edges: any[] = [];
      let prevId = 'node-start';

      steps.forEach((s, i) => {
        const id = `node-step-${i + 1}`;
        nodes.push({ id, type: s.action, action: s.action, config: { target: s.target, value: s.value } });
        edges.push({ source: prevId, target: id });
        prevId = id;
      });

      nodes.push({ id: 'node-end', type: 'end', config: {} });
      edges.push({ source: prevId, target: 'node-end' });
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
