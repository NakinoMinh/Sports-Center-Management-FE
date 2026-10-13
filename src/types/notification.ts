export type ClassNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPage = {
  items: ClassNotification[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type NotificationFilter = {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
};
