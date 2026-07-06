import { Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { registerPasteHandler } from './paste-handler';
import { DEFAULT_SETTINGS, ImgBedSettings, ImgBedSettingTab } from './settings';

export default class ImgBedPlugin extends Plugin {
	settings!: ImgBedSettings;

	async onload() {
		await this.loadSettings();

		registerCommands(this);
		registerPasteHandler(this);
		this.addSettingTab(new ImgBedSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ImgBedSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
