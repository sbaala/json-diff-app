export const Encodings = {
	base64: {
		name: 'Base64',
		encode: (str: string) => {
			try {
				return btoa(unescape(encodeURIComponent(str)));
			} catch {
				throw new Error('Failed to encode to Base64');
			}
		},
		decode: (str: string) => {
			try {
				return decodeURIComponent(escape(atob(str)));
			} catch {
				throw new Error('Invalid Base64 string');
			}
		}
	},

	base64url: {
		name: 'Base64 URL-safe',
		encode: (str: string) => {
			const b64 = Encodings.base64.encode(str);
			return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
		},
		decode: (str: string) => {
			const padded = str + '==='.slice((str.length + 3) % 4);
			const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
			return Encodings.base64.decode(b64);
		}
	},

	hex: {
		name: 'Hexadecimal',
		encode: (str: string) => {
			let hex = '';
			for (let i = 0; i < str.length; i++) {
				hex += ('0' + str.charCodeAt(i).toString(16)).slice(-2);
			}
			return hex;
		},
		decode: (str: string) => {
			let result = '';
			for (let i = 0; i < str.length; i += 2) {
				result += String.fromCharCode(parseInt(str.substr(i, 2), 16));
			}
			return result;
		}
	},

	url: {
		name: 'URL Encoding',
		encode: (str: string) => encodeURIComponent(str),
		decode: (str: string) => decodeURIComponent(str)
	},

	html: {
		name: 'HTML Entity',
		encode: (str: string) => {
			const map: Record<string, string> = {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
				'/': '&#x2F;'
			};
			return str.replace(/[&<>"'/]/g, (c) => map[c]);
		},
		decode: (str: string) => {
			const div = document.createElement('div');
			div.innerHTML = str;
			return div.textContent || '';
		}
	},

	unicode: {
		name: 'Unicode Escape',
		encode: (str: string) => {
			return str
				.split('')
				.map((char) => {
					const code = char.charCodeAt(0);
					return '\\u' + ('0000' + code.toString(16)).slice(-4);
				})
				.join('');
		},
		decode: (str: string) => {
			return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
		}
	}
};

export type EncodingType = keyof typeof Encodings;

export function getEncoding(type: EncodingType) {
	return Encodings[type];
}

export function listEncodings() {
	return Object.entries(Encodings).map(([key, value]) => ({
		key: key as EncodingType,
		name: value.name
	}));
}
