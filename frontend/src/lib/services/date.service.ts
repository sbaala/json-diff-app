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
	static parseCronExpression(cron: string): string {
		const parts = cron.trim().split(/\s+/);
		if (parts.length < 5) {
			return 'Invalid cron expression: requires 5 fields (minute hour day month dayofweek)';
		}

		const [minute, hour, day, month, dayOfWeek] = parts;

		let description = 'Runs ';

		if (minute === '*' && hour === '*' && day === '*' && month === '*') {
			description += 'every minute';
		} else if (minute === '0' && hour === '*' && day === '*' && month === '*') {
			description += 'every hour';
		} else if (minute === '0' && hour === '0' && day === '*' && month === '*') {
			description += 'every day at midnight';
		} else if (minute === '0' && hour === '0' && day === '1' && month === '*') {
			description += 'on the 1st of every month at midnight';
		} else if (minute === '0' && hour === '0' && dayOfWeek === '0') {
			description += 'every Sunday at midnight';
		} else {
			description += `at ${hour}:${minute}`;
		}

		return description;
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
