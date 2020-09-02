import { HelpConfig } from './help-config';
import { BBHelpHelpWidgetRenderer } from './help-widget-renderer';
import { BBHelpStyleUtility } from './help-widget-style-utility';

import { CommunicationAction } from './models/communication-action';
import { BBHelpCommunicationService } from './service/communication.service';

const HELP_CLOSED_CLASS: string = 'bb-help-closed';
const MOBILE_CONTAINER_CLASS: string = 'bb-help-container-mobile';
const DISABLE_TRANSITION: string = 'bb-help-disable-transition';
const MOBILE_WIDTH_CLASS: string = 'bb-help-mobile-width';
const SCREEN_XS_MAX: number = 767;
const PANEL_HEIGHT: number = 591;

export class BBHelpHelpWidget {
  public iframe: HTMLIFrameElement;
  public config: HelpConfig;
  public currentHelpKey: string;
  public onHelpLoaded: any;
  private widgetRenderer: BBHelpHelpWidgetRenderer;
  private communicationService: BBHelpCommunicationService;
  private styleUtility: BBHelpStyleUtility;
  private container: HTMLElement;
  private invoker: HTMLElement;
  private elementsLoaded: boolean = false;
  private widgetDisabled: boolean = false;
  private defaultHelpKey: string = 'default.html';
  private loadCalled: boolean = false;
  private isSetForMobile: boolean;
  private configSettings: any = {};

  constructor(
    widgetRenderer: BBHelpHelpWidgetRenderer,
    communicationService: BBHelpCommunicationService,
    styleUtility: BBHelpStyleUtility
  ) {
    this.styleUtility = styleUtility;
    this.widgetRenderer = widgetRenderer;
    this.communicationService = communicationService;
  }

  public init() {
    this.styleUtility.addAllStyles();
    this.createElements();
    this.setUpInvokerEvents();
    this.renderElements();
    this.setUpCommunication();
    window.addEventListener('resize', () => {
      this.setClassesForWindowSize();
    });
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
    this.configSettings = config;

    this.init();

    return this.ready()
      .then(() => {
        this.loadCalled = true;
        this.config = config;
        if (config.defaultHelpKey !== undefined) {
          this.defaultHelpKey = config.defaultHelpKey;
        }

        config.hostQueryParams = this.getQueryParams();

        if (config.getCurrentHelpKey !== undefined) {
          this.getCurrentHelpKey = config.getCurrentHelpKey;
          delete config.getCurrentHelpKey;
        }

        if (config.onHelpLoaded !== undefined) {
          this.onHelpLoaded = config.onHelpLoaded;
          delete config.onHelpLoaded;
        }

        this.sanitizeConfig();
        this.sendConfig();
      });
  }

  public close() {
    // Wait for client close transition to finish to send close message to SPA
    setTimeout(() => {
      this.communicationService.postMessage({
        messageType: 'help-widget-closed'
      });
    }, 300);
    this.container.classList.add(HELP_CLOSED_CLASS);
    this.invoker.setAttribute('aria-pressed', 'false');
    this.invoker.setAttribute('aria-expanded', 'false');
  }

  public open(helpKey: string = this.getHelpKey()) {
    if (!this.widgetDisabled) {
      this.communicationService.postMessage({
        helpKey,
        messageType: 'open-to-help-key'
      });

      this.container.classList.remove(HELP_CLOSED_CLASS);
      this.invoker.setAttribute('aria-pressed', 'true');
      this.invoker.setAttribute('aria-expanded', 'true');
      this.invoker.focus();
    }
  }

  public toggleOpen(helpKey?: string) {
    if (this.isCollapsed()) {
      this.open(helpKey);
    } else {
      this.close();
    }
  }

  public setCurrentHelpKey(helpKey: string = this.defaultHelpKey): void {

    this.currentHelpKey = helpKey;

    this.communicationService.postMessage({
      helpKey,
      messageType: 'update-current-help-key'
    }, this.configSettings.preferredOrigin);
  }

  public setHelpKeyToDefault(): void {
    this.setCurrentHelpKey(this.defaultHelpKey);
  }

  public disableWidget(): void {
    this.widgetDisabled = true;
    this.close();
    this.invoker.classList.add('bb-help-hidden');
    this.container.classList.add('bb-help-hidden');
  }

  public enableWidget(): void {
    this.widgetDisabled = false;
    this.invoker.classList.remove('bb-help-hidden');
    this.container.classList.remove('bb-help-hidden');
  }

  public getWhatsNewRevision(): number {
    if (this.config.whatsNewRevisions && this.config.whatsNewRevisions.length > 0) {
      const revisions = this.config.whatsNewRevisions.split(';');
      const foundRevision = revisions.find((revision: any) => {
        return revision.includes(`${this.config.productId}=`);
      });
      if (foundRevision) {
        return parseInt(foundRevision.substring(this.config.productId.length + 1), 10);
      }
    }
    return 0;
  }

  private widgetReady() {
    return new Promise((resolve, reject) => {
      let readyAttempts = 0;
      const duration: number = 100;
      const maxIterations: number = 50;

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
    this.communicationService.bindChildWindowReference(this.iframe);
    this.communicationService.communicationAction.subscribe((action: CommunicationAction) => {
      this.actionResponse(action);
    });
  }

  private actionResponse(action: CommunicationAction) {
    switch (action.messageType) {
      case 'Close Widget':
        this.invoker.focus();
        this.close();
        break;
        case 'Open Widget':
          this.invoker.focus();
          this.open(action.helpKey);
          break;
      case 'Child Window Ready':
        if (this.loadCalled) {
          this.sendConfig();
        }
        break;
      case 'Config Loaded':
        const configData = JSON.parse(action.data);
        this.updateConfigKeys(configData);
        this.renderInvoker();
        if (this.onHelpLoaded) {
          this.onHelpLoaded();
        }
        break;
      default:
        console.error(`No matching response for action: ${action.messageType}`);
    }
  }

  private updateConfigKeys(configOptions: any) {
    this.config = configOptions;
    if (configOptions.defaultHelpKey) {
      this.defaultHelpKey = configOptions.defaultHelpKey;
    }
  }

  private getQueryParams(): string {
    const results = window.location.search;
    return results;
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
    this.setClassesForWindowSize();
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

  private setClassesForWindowSize() {
    this.container.classList.add(DISABLE_TRANSITION);

    if (this.isSetForMobile !== true && (this.isMobileWidth() || this.isMobileHeight())) {
      this.isSetForMobile = true;
      this.container.classList.add(MOBILE_CONTAINER_CLASS);
    }

    if (this.isSetForMobile !== false && !this.isMobileWidth() && !this.isMobileHeight()) {
      this.isSetForMobile = false;
      this.container.classList.remove(MOBILE_CONTAINER_CLASS);
    }

    /**
     * This is to trigger a reflow, and flush the CSS changes with the class switch cached by the browser.
     * http://gent.ilcore.com/2011/03/how-not-to-trigger-layout-in-webkit.html
     * https://stackoverflow.com/q/11131875/10070672
     */
    // tslint:disable-next-line
    this.container.offsetWidth;
    this.container.classList.remove(DISABLE_TRANSITION);
  }

  private isMobileWidth(): boolean {
    if (window.innerWidth <= SCREEN_XS_MAX) {
      if (!this.invoker.classList.contains(MOBILE_WIDTH_CLASS)) {
        this.invoker.classList.add(MOBILE_WIDTH_CLASS);
      }
      return true;
    }

    if (this.invoker.classList.contains(MOBILE_WIDTH_CLASS)) {
      this.invoker.classList.remove(MOBILE_WIDTH_CLASS);
    }

    return false;
  }

  private isMobileHeight(): boolean {
    return window.innerHeight <= PANEL_HEIGHT;
  }

  private getHelpKey() {
    if ((typeof (this.getCurrentHelpKey) === 'function')) {
      return this.getCurrentHelpKey();
    }

    return this.getCurrentHelpKey;
  }

  private getCurrentHelpKey: any = () => {
    return this.currentHelpKey || this.defaultHelpKey;
  }

  private sanitizeConfig() {
    this.config = JSON.parse(JSON.stringify(this.config));
  }
}
