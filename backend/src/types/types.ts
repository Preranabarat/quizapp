export interface RoomType {
  topic: string;
  roomTimeLimit: number;
  playerCount: number;
  questionCount: number;
  difficulty: string;
  user?: string;
  username?: string;
}
