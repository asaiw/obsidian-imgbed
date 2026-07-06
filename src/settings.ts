import { App, PluginSettingTab, Setting } from 'obsidian';
import ImgBedPlugin from './main';

export type AuthMode = 'token' | 'authCode';

export interface ImgBedSettings {
	baseUrl: string;
	authMode: AuthMode;
	apiToken: string;
	authCode: string;
	uploadChannel: string;
	channelName: string;
	uploadFolder: string;
	uploadNameType: string;
	returnFullUrl: boolean;
	serverCompress: boolean;
	autoRetry: boolean;
	autoUploadPastedImages: boolean;
}

export const DEFAULT_SETTINGS: ImgBedSettings = {
	baseUrl: 'https://cfbed.sanyue.de',
	authMode: 'token',
	apiToken: '',
	authCode: '',
	uploadChannel: 'telegram',
	channelName: '',
	uploadFolder: '',
	uploadNameType: 'default',
	returnFullUrl: true,
	serverCompress: true,
	autoRetry: true,
	autoUploadPastedImages: true,
};

export class ImgBedSettingTab extends PluginSettingTab {
	plugin: ImgBedPlugin;

	constructor(app: App, plugin: ImgBedPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('图床地址')
			.setDesc('填写你自己部署的 CloudFlare ImgBed 地址，例如 https://cfbed.sanyue.de。')
			.addText((text) =>
				text
					.setPlaceholder('https://cfbed.sanyue.de')
					.setValue(this.plugin.settings.baseUrl)
					.onChange(async (value) => {
						this.plugin.settings.baseUrl = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('认证方式')
			.setDesc('推荐使用 API_TOKEN，可上传和删除；上传认证码仅支持上传。')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('token', 'API_TOKEN')
					.addOption('authCode', '上传认证码')
					.setValue(this.plugin.settings.authMode)
					.onChange(async (value) => {
						this.plugin.settings.authMode = value as AuthMode;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (this.plugin.settings.authMode === 'token') {
			new Setting(containerEl)
				.setName('API_TOKEN')
				.setDesc('填写图床后台生成的 API_TOKEN。上传需要 upload 权限，删除需要 delete 权限。')
				.addText((text) => {
					text.inputEl.type = 'password';
					text
						.setPlaceholder('粘贴 API_TOKEN')
						.setValue(this.plugin.settings.apiToken)
						.onChange(async (value) => {
							this.plugin.settings.apiToken = value.trim();
							await this.plugin.saveSettings();
						});
				});
		} else {
			new Setting(containerEl)
				.setName('上传认证码')
				.setDesc('用于上传接口的 authCode 参数，仅支持上传。')
				.addText((text) => {
					text.inputEl.type = 'password';
					text
						.setPlaceholder('填写上传认证码')
						.setValue(this.plugin.settings.authCode)
						.onChange(async (value) => {
							this.plugin.settings.authCode = value.trim();
							await this.plugin.saveSettings();
						});
				});
		}

		new Setting(containerEl)
			.setName('上传渠道')
			.setDesc('例如 telegram、cfr2、s3、discord、huggingface、webdav。')
			.addText((text) =>
				text
					.setPlaceholder('telegram')
					.setValue(this.plugin.settings.uploadChannel)
					.onChange(async (value) => {
						this.plugin.settings.uploadChannel = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('渠道名称')
			.setDesc('可选。图床配置了多个渠道时填写指定渠道名称。')
			.addText((text) =>
				text
					.setPlaceholder('留空使用默认渠道')
					.setValue(this.plugin.settings.channelName)
					.onChange(async (value) => {
						this.plugin.settings.channelName = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('上传目录')
			.setDesc('可选。填写相对目录，例如 img/notes。')
			.addText((text) =>
				text
					.setPlaceholder('img/notes')
					.setValue(this.plugin.settings.uploadFolder)
					.onChange(async (value) => {
						this.plugin.settings.uploadFolder = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('文件命名方式')
			.setDesc('选择图床上传后的文件命名规则。')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('default', '默认：前缀_原名')
					.addOption('index', '仅前缀')
					.addOption('origin', '仅原名')
					.addOption('short', '短链接')
					.setValue(this.plugin.settings.uploadNameType)
					.onChange(async (value) => {
						this.plugin.settings.uploadNameType = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('返回完整链接')
			.setDesc('上传成功后尽量使用包含域名的完整图片链接。')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.returnFullUrl)
					.onChange(async (value) => {
						this.plugin.settings.returnFullUrl = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('粘贴图片时自动上传')
			.setDesc('在 Markdown 文档中粘贴图片时，自动上传到图床并插入远程链接。')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoUploadPastedImages)
					.onChange(async (value) => {
						this.plugin.settings.autoUploadPastedImages = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('服务端压缩')
			.setDesc('上传渠道支持时，启用图床服务端压缩。')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.serverCompress)
					.onChange(async (value) => {
						this.plugin.settings.serverCompress = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('自动重试')
			.setDesc('上传失败时，让图床在支持的情况下自动切换渠道重试。')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoRetry)
					.onChange(async (value) => {
						this.plugin.settings.autoRetry = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
