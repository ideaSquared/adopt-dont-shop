import { palette, font } from './colors';

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

	font: {
		family: {
			body: string;
		};
		weight: {
			body: number;
			bold: number;
		};
		size: {
			body: string;
		};
	};
};

export const lightTheme: Theme = {
	text: {
		body: palette.black,
		dark: palette.black,
		light: palette.gray,
		dim: palette.lightGray,
		highlight: palette.primary,
		link: palette.blue,
		danger: palette.red,
		success: palette.green,
		warning: palette.yellow,
		info: palette.cyan,
	},
	background: {
		body: palette.white,
		content: palette.lightGray,
		contrast: palette.black,
		highlight: palette.primaryLight,
		mouseHighlight: palette.primaryDark,
		danger: palette.redLight,
		success: palette.greenLight,
		warning: palette.yellowLight,
		info: palette.cyanLight,
	},
	border: {
		content: palette.gray,
		focus: palette.primary,
	},
	font: {
		family: {
			body: font.family.body,
		},
		weight: {
			body: font.weight.body,
			bold: font.weight.bold,
		},
		size: {
			body: font.size.body,
		},
	},
};

export const darkTheme: Theme = {
	text: {
		body: palette.white,
		dark: palette.lightGray,
		light: palette.gray,
		dim: palette.darkGray,
		highlight: palette.primary,
		link: palette.blue,
		danger: palette.red,
		success: palette.green,
		warning: palette.yellow,
		info: palette.cyan,
	},
	background: {
		body: palette.black,
		content: palette.darkGray,
		contrast: palette.white,
		highlight: palette.primaryDark,
		mouseHighlight: palette.primaryLight,
		danger: palette.redDark,
		success: palette.greenDark,
		warning: palette.yellowDark,
		info: palette.cyanDark,
	},
	border: {
		content: palette.darkGray,
		focus: palette.primary,
	},
	font: {
		family: {
			body: font.family.body,
		},
		weight: {
			body: font.weight.body,
			bold: font.weight.bold,
		},
		size: {
			body: font.size.body,
		},
	},
};
