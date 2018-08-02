require('./styles/widget-styles.scss');
require('./styles/omnibar-style-adjustments.scss');

import { BBHelpCommunicationService } from './communication.service';
import { BBHelpHelpWidgetRenderer } from './help-widget-renderer';
import { HelpConfig } from './help-config';

const HELP_CLOSED_CLASS: string = 'bb-help-closed';

export class BBHelpHelpWidget {
  public iframe: HTMLIFrameElement;
  public config: HelpConfig;
  private widgetRenderer: BBHelpHelpWidgetRenderer;
  private communicationService: BBHelpCommunicationService;
  private container: HTMLElement;
  private invoker: HTMLElement;
  private elementsLoaded: boolean = false;

  private defaultHelpKey: string = 'default.html';
  private currentHelpKey: string;
  private loadCalled: boolean = false;
  private configRequested: boolean = false;

  constructor() {
    this.widgetRenderer = new BBHelpHelpWidgetRenderer();
    this.createElements();
    this.setUpInvokerEvents();
    this.renderElements();
    this.setUpCommunication();
  }

  public ready() {
    return this.widgetReady()
      .then(() => {
        return this.communicationService.ready();
      })
      .catch((err: string) => {
        console.error(err);
      });
  }

  public load(config: HelpConfig) {

    if (this.loadCalled) {
      return;
    }

    this.loadCalled = true;
    this.config = config;
    if (config.defaultHelpKey !== undefined) {
      this.defaultHelpKey = config.defaultHelpKey;
    }

    if (this.config.hideWidgetOnMobile) {
      this.container.classList.add('hide-on-mobile');
    }

    this.renderInvoker();
    this.sendConfig();
  }

  public close() {
    this.container.style.maxWidth = '0';
    this.container.classList.add(HELP_CLOSED_CLASS);
    this.invoker.setAttribute('aria-pressed', 'false');
    this.invoker.setAttribute('aria-expanded', 'false');
  }

  public open(helpKey?: string) {
    this.communicationService.postMessage({
      messageType: 'open-to-help-key',
      helpKey
    });

    this.container.classList.remove(HELP_CLOSED_CLASS);
    this.container.style.maxWidth = '100%';
    this.invoker.setAttribute('aria-pressed', 'true');
    this.invoker.setAttribute('aria-expanded', 'true');
  }

  public toggleOpen(helpKey?: string) {
    if (this.isCollapsed()) {
      this.open(helpKey);
    } else {
      this.close();
    }
  }

  public getCurrentHelpKey(): string {
    return this.currentHelpKey || this.defaultHelpKey;
  }

  public setCurrentHelpKey(helpKey: string = this.defaultHelpKey): void {
    this.currentHelpKey = helpKey;
  }

  public setHelpKeyToDefault(): void {
    this.setCurrentHelpKey(this.defaultHelpKey);
  }

  public disableWidget(): void {
    // BBHELP.HelpWidget.disableWidget(); disable widget
  }

  public enableWidget(): void {
    // BBHELP.HelpWidget.enableWidget(); enable widget
  }

  private widgetReady() {
    return new Promise((resolve, reject) => {
      let readyAttempts = 0;
      const duration = 100;
      const maxIterations = 100;

      const interval = setInterval(() => {
        readyAttempts++;
        if (this.elementsLoaded) {
          clearInterval(interval);
          resolve();
        }

        if (readyAttempts >= maxIterations) {
          clearInterval(interval);
          reject('The Help Widget failed to load.');
        }
      }, duration);
    });
  }

  private setUpCommunication() {
    this.communicationService = new BBHelpCommunicationService(this.iframe);
    this.communicationService.communicationAction.subscribe((action: string) => {
      this.actionResponse(action);
    });
  }

  private actionResponse(action: string) {
    switch (action) {
      case 'Close Widget':
        this.close();
        break;
      case 'Get Help Key':
        /**
         * Methods can not be added to the config being passed to the SPA through the communicationService.
         * The results of the Help Key need to be passed through when quereied.
         */
        this.communicationService.postMessage({
          helpKey: this.getCurrentHelpKey(),
          messageType: 'help-key'
        });
        break;
        case 'Child Window Ready':
          if (this.loadCalled) {
            this.sendConfig();
          }
          break;
        default:
    }
  }

  private sendConfig() {
    this.communicationService.postMessage({
      config: this.config,
      messageType: 'user-config'
    });
  }

  private renderInvoker() {
    this.widgetRenderer.addInvokerStyles(this.invoker, this.config);
    this.container.insertBefore(this.invoker, this.iframe);
  }

  private createElements() {
    this.container = this.widgetRenderer.createContainer();
    this.invoker = this.widgetRenderer.createInvoker();
    this.iframe = this.widgetRenderer.createIframe();
    this.elementsLoaded = true;
  }

  private renderElements() {
    this.widgetRenderer.appendElement(this.container);
    this.widgetRenderer.appendElement(this.iframe, this.container);
  }

  private setUpInvokerEvents() {
    this.invoker.addEventListener('click', () => {
      this.toggleOpen();
    });
  }

  private isCollapsed() {
    return this.container.classList.contains(HELP_CLOSED_CLASS);
  } 
}