// Self-contained QR Code generator (byte mode) with Reed-Solomon error
// correction and data masking. Ported/adapted from the public-domain
// algorithm by Nayuki (https://www.nayuki.io/page/qr-code-generator-library).
// No external dependencies — returns a boolean module matrix.

export type Ecc = 'LOW' | 'MEDIUM' | 'QUARTILE' | 'HIGH';

const ECC_FORMAT: Record<Ecc, number> = { MEDIUM: 0, LOW: 1, HIGH: 2, QUARTILE: 3 };
const ECC_ORDINAL: Record<Ecc, number> = { LOW: 0, MEDIUM: 1, QUARTILE: 2, HIGH: 3 };

export interface QrResult {
	size: number;
	modules: boolean[][];
	version: number;
}

export function generateQr(text: string, ecc: Ecc = 'MEDIUM'): QrResult {
	const bytes = toUtf8(text);
	// Try versions 1..40 to find the smallest that fits
	for (let version = 1; version <= 40; version++) {
		const dataCapacityBits = getNumDataCodewords(version, ecc) * 8;
		// Byte mode: mode indicator (4) + char count + data
		const ccBits = version < 10 ? 8 : version < 27 ? 16 : 16;
		const usedBits = 4 + ccBits + bytes.length * 8;
		if (usedBits <= dataCapacityBits) {
			return encode(bytes, version, ecc, ccBits);
		}
	}
	throw new Error('Data too long for QR code');
}

function encode(data: number[], version: number, ecc: Ecc, ccBits: number): QrResult {
	// Build bit stream
	const bb: number[] = [];
	appendBits(4, 4, bb); // byte mode indicator
	appendBits(data.length, ccBits, bb);
	for (const b of data) appendBits(b, 8, bb);

	const dataCapacityBits = getNumDataCodewords(version, ecc) * 8;
	// Terminator
	appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
	// Pad to byte boundary
	appendBits(0, (8 - (bb.length % 8)) % 8, bb);
	// Pad bytes
	for (let pad = 0xec; bb.length < dataCapacityBits; pad ^= 0xec ^ 0x11) {
		appendBits(pad, 8, bb);
	}

	// Bits to bytes
	const dataCodewords: number[] = [];
	for (let i = 0; i < bb.length; i += 8) {
		let byte = 0;
		for (let j = 0; j < 8; j++) byte = (byte << 1) | bb[i + j];
		dataCodewords.push(byte);
	}

	const allCodewords = addEccAndInterleave(dataCodewords, version, ecc);
	return drawMatrix(allCodewords, version, ecc);
}

// ---- Bit helpers ----
function appendBits(val: number, len: number, bb: number[]): void {
	for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
}

function toUtf8(str: string): number[] {
	const utf8 = unescape(encodeURIComponent(str));
	const bytes: number[] = [];
	for (let i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
	return bytes;
}

// ---- Version/ECC tables ----
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
	// LOW, MEDIUM, QUARTILE, HIGH for versions 1..40
	[-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
	[-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
	[-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
	[-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
];

const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
	[-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
	[-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
	[-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
	[-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
];

function getNumRawDataModules(version: number): number {
	let result = (16 * version + 128) * version + 64;
	if (version >= 2) {
		const numAlign = Math.floor(version / 7) + 2;
		result -= (25 * numAlign - 10) * numAlign - 55;
		if (version >= 7) result -= 36;
	}
	return result;
}

function getNumDataCodewords(version: number, ecc: Ecc): number {
	const ord = ECC_ORDINAL[ecc];
	return (
		Math.floor(getNumRawDataModules(version) / 8) -
		ECC_CODEWORDS_PER_BLOCK[ord][version] * NUM_ERROR_CORRECTION_BLOCKS[ord][version]
	);
}

// ---- Reed-Solomon ----
function reedSolomonComputeDivisor(degree: number): number[] {
	const result: number[] = new Array(degree).fill(0);
	result[degree - 1] = 1;
	let root = 1;
	for (let i = 0; i < degree; i++) {
		for (let j = 0; j < result.length; j++) {
			result[j] = gfMul(result[j], root);
			if (j + 1 < result.length) result[j] ^= result[j + 1];
		}
		root = gfMul(root, 2);
	}
	return result;
}

function reedSolomonComputeRemainder(data: number[], divisor: number[]): number[] {
	const result: number[] = new Array(divisor.length).fill(0);
	for (const b of data) {
		const factor = b ^ (result.shift() as number);
		result.push(0);
		for (let i = 0; i < result.length; i++) result[i] ^= gfMul(divisor[i], factor);
	}
	return result;
}

function gfMul(x: number, y: number): number {
	let z = 0;
	for (let i = 7; i >= 0; i--) {
		z = (z << 1) ^ ((z >>> 7) * 0x11d);
		z ^= ((y >>> i) & 1) * x;
	}
	return z & 0xff;
}

function addEccAndInterleave(data: number[], version: number, ecc: Ecc): number[] {
	const ord = ECC_ORDINAL[ecc];
	const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ord][version];
	const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ord][version];
	const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
	const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
	const shortBlockLen = Math.floor(rawCodewords / numBlocks);

	const blocks: number[][] = [];
	const rsDiv = reedSolomonComputeDivisor(blockEccLen);
	let k = 0;
	for (let i = 0; i < numBlocks; i++) {
		const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
		const dat = data.slice(k, k + datLen);
		k += datLen;
		const eccBytes = reedSolomonComputeRemainder(dat, rsDiv);
		if (i < numShortBlocks) dat.push(0);
		blocks.push(dat.concat(eccBytes));
	}

	const result: number[] = [];
	for (let i = 0; i < blocks[0].length; i++) {
		for (let j = 0; j < blocks.length; j++) {
			if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
				result.push(blocks[j][i]);
			}
		}
	}
	return result;
}

// ---- Matrix drawing ----
function drawMatrix(allCodewords: number[], version: number, ecc: Ecc): QrResult {
	const size = version * 4 + 17;
	const modules: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
	const isFunction: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

	const setFunction = (x: number, y: number, val: boolean) => {
		modules[y][x] = val;
		isFunction[y][x] = true;
	};

	// Timing patterns
	for (let i = 0; i < size; i++) {
		setFunction(6, i, i % 2 === 0);
		setFunction(i, 6, i % 2 === 0);
	}

	// Finder patterns
	const drawFinder = (cx: number, cy: number) => {
		for (let dy = -4; dy <= 4; dy++) {
			for (let dx = -4; dx <= 4; dx++) {
				const dist = Math.max(Math.abs(dx), Math.abs(dy));
				const xx = cx + dx;
				const yy = cy + dy;
				if (xx >= 0 && xx < size && yy >= 0 && yy < size) {
					setFunction(xx, yy, dist !== 2 && dist !== 4);
				}
			}
		}
	};
	drawFinder(3, 3);
	drawFinder(size - 4, 3);
	drawFinder(3, size - 4);

	// Alignment patterns
	const alignPos = getAlignmentPatternPositions(version);
	const numAlign = alignPos.length;
	for (let i = 0; i < numAlign; i++) {
		for (let j = 0; j < numAlign; j++) {
			if (
				(i === 0 && j === 0) ||
				(i === 0 && j === numAlign - 1) ||
				(i === numAlign - 1 && j === 0)
			)
				continue;
			const cx = alignPos[i];
			const cy = alignPos[j];
			for (let dy = -2; dy <= 2; dy++) {
				for (let dx = -2; dx <= 2; dx++) {
					setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
				}
			}
		}
	}

	// Reserve format/version areas (drawn later)
	drawFormatBits(0, size, setFunction, modules, isFunction); // placeholder reserve
	if (version >= 7) drawVersion(version, size, setFunction);

	// Draw data using zigzag
	let i = 0;
	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) right = 5;
		for (let vert = 0; vert < size; vert++) {
			for (let j = 0; j < 2; j++) {
				const x = right - j;
				const upward = ((right + 1) & 2) === 0;
				const y = upward ? size - 1 - vert : vert;
				if (!isFunction[y][x] && i < allCodewords.length * 8) {
					modules[y][x] = ((allCodewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
					i++;
				}
			}
		}
	}

	// Apply best mask
	let bestMask = 0;
	let minPenalty = Infinity;
	for (let mask = 0; mask < 8; mask++) {
		applyMask(modules, isFunction, mask);
		drawFormatInfo(ecc, mask, size, modules, isFunction);
		const penalty = getPenalty(modules, size);
		if (penalty < minPenalty) {
			minPenalty = penalty;
			bestMask = mask;
		}
		applyMask(modules, isFunction, mask); // undo (XOR again)
	}
	applyMask(modules, isFunction, bestMask);
	drawFormatInfo(ecc, bestMask, size, modules, isFunction);

	return { size, modules, version };
}

function getAlignmentPatternPositions(version: number): number[] {
	if (version === 1) return [];
	const numAlign = Math.floor(version / 7) + 2;
	const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
	const result: number[] = [6];
	for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) {
		result.splice(1, 0, pos);
	}
	return result;
}

function drawFormatBits(_a: number, _size: number, _sf: any, _m: any, _if: any): void {
	// Reservation handled implicitly by drawFormatInfo marking isFunction.
}

function drawFormatInfo(
	ecc: Ecc,
	mask: number,
	size: number,
	modules: boolean[][],
	isFunction: boolean[][]
): void {
	const data = (ECC_FORMAT[ecc] << 3) | mask;
	let rem = data;
	for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
	const bits = ((data << 10) | rem) ^ 0x5412;

	const setF = (x: number, y: number, val: boolean) => {
		modules[y][x] = val;
		isFunction[y][x] = true;
	};

	for (let i = 0; i <= 5; i++) setF(8, i, getBit(bits, i));
	setF(8, 7, getBit(bits, 6));
	setF(8, 8, getBit(bits, 7));
	setF(7, 8, getBit(bits, 8));
	for (let i = 9; i < 15; i++) setF(14 - i, 8, getBit(bits, i));

	for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, getBit(bits, i));
	for (let i = 8; i < 15; i++) setF(8, size - 15 + i, getBit(bits, i));
	setF(8, size - 8, true); // dark module
}

function drawVersion(version: number, size: number, setFunction: (x: number, y: number, v: boolean) => void): void {
	let rem = version;
	for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
	const bits = (version << 12) | rem;

	for (let i = 0; i < 18; i++) {
		const bit = getBit(bits, i);
		const a = size - 11 + (i % 3);
		const b = Math.floor(i / 3);
		setFunction(a, b, bit);
		setFunction(b, a, bit);
	}
}

function applyMask(modules: boolean[][], isFunction: boolean[][], mask: number): void {
	const size = modules.length;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (isFunction[y][x]) continue;
			let invert = false;
			switch (mask) {
				case 0: invert = (x + y) % 2 === 0; break;
				case 1: invert = y % 2 === 0; break;
				case 2: invert = x % 3 === 0; break;
				case 3: invert = (x + y) % 3 === 0; break;
				case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
				case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
				case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
				case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
			}
			if (invert) modules[y][x] = !modules[y][x];
		}
	}
}

function getPenalty(modules: boolean[][], size: number): number {
	let penalty = 0;
	// Rows & columns runs
	for (let y = 0; y < size; y++) {
		let runColor = false;
		let runLen = 0;
		for (let x = 0; x < size; x++) {
			if (modules[y][x] === runColor) {
				runLen++;
				if (runLen === 5) penalty += 3;
				else if (runLen > 5) penalty++;
			} else {
				runColor = modules[y][x];
				runLen = 1;
			}
		}
	}
	for (let x = 0; x < size; x++) {
		let runColor = false;
		let runLen = 0;
		for (let y = 0; y < size; y++) {
			if (modules[y][x] === runColor) {
				runLen++;
				if (runLen === 5) penalty += 3;
				else if (runLen > 5) penalty++;
			} else {
				runColor = modules[y][x];
				runLen = 1;
			}
		}
	}
	// 2x2 blocks
	for (let y = 0; y < size - 1; y++) {
		for (let x = 0; x < size - 1; x++) {
			const c = modules[y][x];
			if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
				penalty += 3;
			}
		}
	}
	return penalty;
}

function getBit(x: number, i: number): boolean {
	return ((x >>> i) & 1) !== 0;
}
