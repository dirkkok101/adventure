export interface ValidationError {
    scene: string;
    type: 'error' | 'warning';
    message: string;
    details?: string;
    path?: string;
    fix?: string;
}

export interface ValidationSummary {
    errors: number;
    warnings: number;
    details: ValidationError[];
    toString(): string;
}
