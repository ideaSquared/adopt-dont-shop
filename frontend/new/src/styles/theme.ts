import { palette } from './colors';

export type Theme = {
	text: {
		body: string;
		dark: string;
		light: string;
		dim: string;
		highlight: string;
		link: string;
		danger: string;
		success: string;
		warning: string;
		info: string;
	};

	background: {
		body: string;
		content: string;
		contrast: string;
		highlight: string;
		mouseHighlight: string;
		danger: string;
		success: string;
		warning: string;
		info: string;
	};

	border: {
		content: string;
		focus: string;
	};
};

export const theme = {
	text: {
		body: palette.darkGrey,
		dark: palette.veryDarkGrey,
		light: palette.white,
		dim: palette.mediumGrey,
		highlight: palette.brightOrange,
		link: palette.brightBlue,
		danger: palette.brightRed,
		success: palette.brightGreen,
		warning: palette.brightOrange,
		info: palette.brightSkyBlue,
	},

	background: {
		body: palette.veryLightGrey,
		content: palette.white,
		contrast: palette.veryDarkGrey,
		highlight: palette.brightYellow,
		mouseHighlight: palette.brightAmber,
		danger: palette.lightRed,
		success: palette.lightGreen,
		warning: palette.lightOrangeYellow,
		info: palette.lightSkyBlue,
	},

	border: {
		content: palette.lightGrey,
		focus: palette.brightOrange,
	},
};
