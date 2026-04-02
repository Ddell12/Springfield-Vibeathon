export type ThemePreset = "calm" | "playful" | "focused";

export type AppShellConfig = {
  themePreset: ThemePreset;
  accentColor: string;
  enableInstructions: boolean;
  enableSounds: boolean;
  enableDifficulty: boolean;
  enableProgress: boolean;
};

export const DEFAULT_APP_SHELL: AppShellConfig = {
  themePreset: "calm",
  accentColor: "#00595c",
  enableInstructions: true,
  enableSounds: true,
  enableDifficulty: true,
  enableProgress: true,
};
