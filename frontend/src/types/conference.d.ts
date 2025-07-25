interface CreateConferenceRequest {
    title: string;
    participants: number[];
    scheduled_at: string;
}

interface CreateConferenceResponse {
    link: string;
    message: string;
    status: boolean;
}