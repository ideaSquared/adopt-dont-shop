// src/types/log.d.ts

export interface Log {
	_id: string;
	timestamp: string;
	level: string;
	service: string;
	message: string;
}
