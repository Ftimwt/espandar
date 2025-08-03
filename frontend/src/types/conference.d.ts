import type { Moment } from "moment";

export interface CreateConferenceRequest {
  title: string;
  participants: number[];
  scheduled_at: Moment;
}

export interface CreateConferenceApiRequest {
  title: string;
  participants: number[];
  scheduled_at?: string;
  code: string;
}

export interface ConferenceModel {

}

export interface CreateConferenceResponse {
  link: string;
  message: string;
  status: boolean;
}

