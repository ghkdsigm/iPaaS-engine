import { Injectable } from "@nestjs/common";

@Injectable()
export class AnthropicService {
  // Placeholder for real LLM integration
  async plan(_prompt: string): Promise<any> {
    return null;
  }
}
