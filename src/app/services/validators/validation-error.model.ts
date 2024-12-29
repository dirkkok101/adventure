export interface ValidationError {
    scene: string;
    type: 'error' | 'warning';
    message: string;
    details?: string;
}
