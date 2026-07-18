export class CryptoService {
	// Base64 encoding/decoding
	static encodeBase64(str: string): string {
		try {
			return btoa(unescape(encodeURIComponent(str)));
		} catch (e) {
			throw new Error('Failed to encode to Base64');
		}
	}

	static decodeBase64(str: string): string {
		try {
			return decodeURIComponent(escape(atob(str)));
		} catch (e) {
			throw new Error('Invalid Base64 string');
		}
	}

	static encodeBase64Url(str: string): string {
		return this.encodeBase64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}

	static decodeBase64Url(str: string): string {
		const padded = str + '==='.slice((str.length + 3) % 4);
		return this.decodeBase64(padded.replace(/-/g, '+').replace(/_/g, '/'));
	}

	// Hashing functions
	static async sha256(str: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(str);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		return this.bufferToHex(hashBuffer);
	}

	static async sha512(str: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(str);
		const hashBuffer = await crypto.subtle.digest('SHA-512', data);
		return this.bufferToHex(hashBuffer);
	}

	static async sha1(str: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(str);
		const hashBuffer = await crypto.subtle.digest('SHA-1', data);
		return this.bufferToHex(hashBuffer);
	}

	static async md5(str: string): Promise<string> {
		// MD5 is cryptographically broken; use SHA-256 for security-sensitive applications
		// For demo purposes, SHA-1 is used as fallback (also deprecated, but more available)
		return this.sha1(str);
	}

	// HMAC
	static async hmacSha256(message: string, key: string): Promise<string> {
		const encoder = new TextEncoder();
		const keyData = await crypto.subtle.importKey(
			'raw',
			encoder.encode(key),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const signature = await crypto.subtle.sign('HMAC', keyData, encoder.encode(message));
		return this.bufferToHex(signature);
	}

	static async hmacSha512(message: string, key: string): Promise<string> {
		const encoder = new TextEncoder();
		const keyData = await crypto.subtle.importKey(
			'raw',
			encoder.encode(key),
			{ name: 'HMAC', hash: 'SHA-512' },
			false,
			['sign']
		);
		const signature = await crypto.subtle.sign('HMAC', keyData, encoder.encode(message));
		return this.bufferToHex(signature);
	}

	// UUID
	static generateUUID(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	static generateUUIDv5(namespace: string, name: string): string {
		// Simplified v5 - in production use a proper library
		const nsHash = this.simpleHash(namespace);
		const nameHash = this.simpleHash(name);
		return `${nsHash.substring(0, 8)}-${nsHash.substring(8, 12)}-5${nsHash.substring(13, 16)}-a${nameHash.substring(13, 16)}-${nameHash.substring(16, 28)}`;
	}

	// ULID
	static generateULID(): string {
		const timestamp = Date.now();
		const randomness = Math.random().toString(36).substring(2).padEnd(10, '0');
		return this.encodeBase32(timestamp.toString()) + randomness;
	}

	// Helper methods
	private static bufferToHex(buffer: ArrayBuffer): string {
		const view = new Uint8Array(buffer);
		let hex = '';
		for (let i = 0; i < view.length; i++) {
			hex += ('0' + view[i].toString(16)).slice(-2);
		}
		return hex;
	}

	private static simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(16).padEnd(32, '0');
	}

	private static encodeBase32(str: string): string {
		const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		let result = '';
		let bits = 0;
		let value = 0;

		for (let i = 0; i < str.length; i++) {
			value = (value << 8) | str.charCodeAt(i);
			bits += 8;

			while (bits >= 5) {
				bits -= 5;
				result += alphabet[(value >> bits) & 31];
			}
		}

		if (bits > 0) {
			result += alphabet[(value << (5 - bits)) & 31];
		}

		return result;
	}
}
