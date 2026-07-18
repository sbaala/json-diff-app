export class DateService {
	// Timestamp conversions
	static dateToTimestamp(date: Date): number {
		return Math.floor(date.getTime() / 1000);
	}

	static timestampToDate(timestamp: number): Date {
		// Handle both seconds and milliseconds
		const ms = timestamp > 9999999999 ? timestamp : timestamp * 1000;
		return new Date(ms);
	}

	static toIso(date: Date): string {
		return date.toISOString();
	}

	static fromIso(isoString: string): Date {
		return new Date(isoString);
	}

	static toUnix(date: Date): number {
		return Math.floor(date.getTime() / 1000);
	}

	static fromUnix(timestamp: number): Date {
		return new Date(timestamp * 1000);
	}

	// Date arithmetic
	static addDays(date: Date, days: number): Date {
		const result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	}

	static addMonths(date: Date, months: number): Date {
		const result = new Date(date);
		result.setMonth(result.getMonth() + months);
		return result;
	}

	static addYears(date: Date, years: number): Date {
		const result = new Date(date);
		result.setFullYear(result.getFullYear() + years);
		return result;
	}

	static getDaysBetween(d1: Date, d2: Date): number {
		const time = Math.abs(d2.getTime() - d1.getTime());
		return Math.floor(time / (1000 * 60 * 60 * 24));
	}

	static getBusinessDaysBetween(start: Date, end: Date, holidays: Date[] = []): number {
		let count = 0;
		const current = new Date(start);
		const holidaySet = new Set(holidays.map((d) => d.toDateString()));

		while (current < end) {
			const dayOfWeek = current.getDay();
			if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(current.toDateString())) {
				count++;
			}
			current.setDate(current.getDate() + 1);
		}

		return count;
	}

	// Formatting
	static format(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');

		return format
			.replace('YYYY', String(year))
			.replace('MM', month)
			.replace('DD', day)
			.replace('HH', hours)
			.replace('mm', minutes)
			.replace('ss', seconds);
	}

	// Relative time
	static formatRelative(date: Date): string {
		const now = new Date();
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (seconds < 30) return 'just now';
		if (seconds < 60) return `${seconds}s ago`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
		if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
		if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
		return `${Math.floor(seconds / 31536000)}y ago`;
	}

	// Timezone
	static getTimezones(): Array<{ name: string; offset: number }> {
		return [
			{ name: 'UTC', offset: 0 },
			{ name: 'EST', offset: -5 },
			{ name: 'CST', offset: -6 },
			{ name: 'MST', offset: -7 },
			{ name: 'PST', offset: -8 },
			{ name: 'GMT', offset: 0 },
			{ name: 'CET', offset: 1 },
			{ name: 'IST', offset: 5.5 },
			{ name: 'JST', offset: 9 },
			{ name: 'AEST', offset: 10 }
		];
	}

	static convertTimezone(date: Date, fromOffset: number, toOffset: number): Date {
		const offsetDiff = (toOffset - fromOffset) * 60 * 60 * 1000;
		return new Date(date.getTime() + offsetDiff);
	}

	// Cron
	private static readonly MONTH_NAMES = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	private static readonly DAY_NAMES = [
		'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
	];

	private static readonly MONTH_ALIASES: Record<string, number> = {
		jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
		jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
	};

	private static readonly DOW_ALIASES: Record<string, number> = {
		sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
	};

	private static ordinal(n: number): string {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}

	/** Validate + expand a single field into the list of matching values. */
	private static parseCronField(
		field: string,
		min: number,
		max: number,
		aliases: Record<string, number> = {}
	): number[] {
		const values = new Set<number>();

		for (const part of field.split(',')) {
			const [rangePart, stepPart] = part.split('/');
			const step = stepPart === undefined ? 1 : Number(stepPart);

			if (stepPart !== undefined && (!Number.isInteger(step) || step < 1)) {
				throw new Error(`invalid step "${stepPart}"`);
			}

			let start: number;
			let end: number;

			if (rangePart === '*') {
				start = min;
				end = max;
			} else if (rangePart.includes('-')) {
				const [a, b] = rangePart.split('-');
				start = this.cronToken(a, aliases);
				end = this.cronToken(b, aliases);
			} else {
				start = this.cronToken(rangePart, aliases);
				end = stepPart !== undefined ? max : start;
			}

			if (start < min || end > max || start > end) {
				throw new Error(`value out of range in "${part}" (allowed ${min}-${max})`);
			}

			for (let v = start; v <= end; v += step) {
				values.add(v);
			}
		}

		return [...values].sort((a, b) => a - b);
	}

	private static cronToken(token: string, aliases: Record<string, number>): number {
		const alias = aliases[token.toLowerCase()];
		if (alias !== undefined) return alias;
		const n = Number(token);
		if (!Number.isInteger(n)) {
			throw new Error(`"${token}" is not a valid value`);
		}
		return n;
	}

	private static describeMinuteHour(minuteField: string, hourField: string): string {
		const minutes = this.parseCronField(minuteField, 0, 59);
		const hours = this.parseCronField(hourField, 0, 23);

		// Every minute
		if (minuteField === '*' && hourField === '*') return 'every minute';

		// Stepped minutes across all hours: */15 * * * *
		const minStep = minuteField.match(/^\*\/(\d+)$/);
		if (minStep && hourField === '*') return `every ${minStep[1]} minutes`;

		if (minuteField === '*') {
			return `every minute past ${this.describeHourSet(hours)}`;
		}

		const hourStep = hourField.match(/^\*\/(\d+)$/);
		if (hourStep) {
			return `at minute ${minutes.join(', ')} past every ${hourStep[1]} hours`;
		}

		if (hourField === '*') {
			return `at minute ${minutes.join(', ')} of every hour`;
		}

		// Specific times: build HH:MM list when both are small enumerations
		if (minutes.length * hours.length <= 12) {
			const times: string[] = [];
			for (const h of hours) {
				for (const m of minutes) {
					times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
				}
			}
			return `at ${times.join(', ')}`;
		}

		return `at minute ${minutes.join(', ')} past ${this.describeHourSet(hours)}`;
	}

	private static describeHourSet(hours: number[]): string {
		return hours.map((h) => `${String(h).padStart(2, '0')}:00`).join(', ');
	}

	static parseCronExpression(cron: string): string {
		const parts = cron.trim().split(/\s+/);
		if (parts.length !== 5) {
			return `Invalid cron expression: requires exactly 5 fields (minute hour day-of-month month day-of-week), got ${parts.length}`;
		}

		const [minute, hour, dom, month, dow] = parts;

		try {
			// Validate every field (throws on bad tokens/ranges).
			this.parseCronField(minute, 0, 59);
			this.parseCronField(hour, 0, 23);
			const domValues = this.parseCronField(dom, 1, 31);
			const monthValues = this.parseCronField(month, 1, 12, this.MONTH_ALIASES);
			const dowValues = this.parseCronField(
				dow === '7' ? '0' : dow.replace(/\b7\b/g, '0'),
				0,
				6,
				this.DOW_ALIASES
			);

			const timePart = this.describeMinuteHour(minute, hour);

			// Day description: DOM and DOW combine with OR when both restricted (cron semantics).
			const domRestricted = dom !== '*';
			const dowRestricted = dow !== '*';

			const dayClauses: string[] = [];

			if (domRestricted) {
				if (domValues.length <= 6) {
					dayClauses.push(`on the ${domValues.map((d) => this.ordinal(d)).join(', ')}`);
				} else {
					dayClauses.push(`on days-of-month ${domValues.join(', ')}`);
				}
			}

			if (dowRestricted) {
				const names = dowValues.map((d) => this.DAY_NAMES[d]);
				dayClauses.push(`on ${names.join(', ')}`);
			}

			let monthClause = '';
			if (month !== '*') {
				const names = monthValues.map((m) => this.MONTH_NAMES[m - 1]);
				monthClause = ` in ${names.join(', ')}`;
			}

			let dayClause = '';
			if (dayClauses.length === 2) {
				dayClause = ` ${dayClauses[0]} and ${dayClauses[1]}`;
			} else if (dayClauses.length === 1) {
				dayClause = ` ${dayClauses[0]}`;
			} else {
				dayClause = ' every day';
			}

			return `Runs ${timePart}${dayClause}${monthClause}.`;
		} catch (e) {
			return `Invalid cron expression: ${(e as Error).message}`;
		}
	}

	static isLeapYear(year: number): boolean {
		return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	}

	static getDaysInMonth(year: number, month: number): number {
		return new Date(year, month + 1, 0).getDate();
	}

	static getWeekNumber(date: Date): number {
		const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
		const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
		return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
	}

	static getQuarter(date: Date): number {
		return Math.ceil((date.getMonth() + 1) / 3);
	}
}
