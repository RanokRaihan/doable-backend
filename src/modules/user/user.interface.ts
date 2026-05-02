import type { Gender, TaskCategory, TaskStatus } from "../../generated/prisma/enums";
import type { Decimal } from "../../generated/prisma/internal/prismaNamespace";

export interface PublicUserProfile {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  gender: Gender | null;
  memberSince: Date;

  stats: {
    asPoster: {
      tasksPosted: number;
      averageRating: number | null;
      reviewCount: number;
    };
    asDoer: {
      tasksCompleted: number;
      completionRate: number | null;
      averageRating: number | null;
      reviewCount: number;
    };
  };

  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    author: { id: string; name: string; image: string | null };
    task: { id: string; title: string };
  }>;

  postedTasks: Array<{
    id: string;
    title: string;
    category: TaskCategory;
    status: TaskStatus;
    baseCompensation: Decimal;
    location: string;
    createdAt: Date;
  }>;
}
