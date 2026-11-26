import { Injectable, Logger } from '@nestjs/common';
import { BrowserContext, Page } from 'playwright';
import { attachPageSecurityPolicies } from '../../common/security/url-security';

@Injectable()
export class PageManagerService {
  private readonly logger = new Logger(PageManagerService.name);

  async createPageWithPolicies(
    context: BrowserContext,
    allowedDomains: string[] = [],
    onConsole?: (level: 'info' | 'warn' | 'error' | 'debug', msg: string) => void,
  ): Promise<Page> {
    const page = await context.newPage();

    if (onConsole) {
      page.on('console', (msg) => {
        const type = msg.type();
        const level = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
        onConsole(level, msg.text());
      });

      page.on('pageerror', (err) => {
        onConsole('error', `Page Exception: ${err.message}`);
      });
    }

    // SSRF Interceptor: Block cloud metadata, private networks, disallowed schemes, downloads, and unapproved domains
    await attachPageSecurityPolicies(page, allowedDomains, (reason, urlStr) => {
      this.logger.warn(`SSRF Block: ${reason} (${urlStr})`);
    });

    return page;
  }

  async captureViewportFrame(page: Page): Promise<string | null> {
    try {
      if (page.isClosed()) return null;
      const buffer = await page.screenshot({ type: 'jpeg', quality: 85 });
      return buffer.toString('base64');
    } catch {
      return null;
    }
  }
}

