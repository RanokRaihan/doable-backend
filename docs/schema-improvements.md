# Improved Prisma Schema - Industry Standards Implementation

This document outlines the improvements that should be applied to your current Prisma schema to follow industry best practices.

## Current Schema Analysis

Your current schema is solid but can be enhanced with the following improvements:

## 1. Database Field Types & Constraints

### Financial Fields

```prisma
// Replace Float with Decimal for money fields
baseCompensation      Decimal          @db.Decimal(10, 2)
agreedCompensation    Decimal?         @db.Decimal(10, 2)
proposedCompensation  Decimal          @db.Decimal(10, 2)
```

### String Field Sizes

```prisma
email                 String           @unique @db.VarChar(255)
name                  String           @db.VarChar(100)
password              String?          @db.VarChar(255)
title                 String           @db.VarChar(200)
description           String           @db.Text
location              String           @db.VarChar(255)
```

## 2. Additional Indexes for Performance

```prisma
model User {
  // ... existing fields

  @@index([email])
  @@index([isDeleted])
  @@index([createdAt])
  @@index([role])
  @@index([profileStatus])
  @@index([emailVerified])
}

model Task {
  // ... existing fields

  @@index([postedById])
  @@index([status])
  @@index([category])      // if you add category field
  @@index([priority])      // if you add priority field
  @@index([scheduledAt])
  @@index([isDeleted])
  @@index([createdAt])
  @@index([location])
}

model Application {
  // ... existing fields

  @@index([applicantId])
  @@index([taskId])
  @@index([status])
  @@index([createdAt])
}

model Review {
  // ... existing fields

  @@index([recipientId])
  @@index([taskId])
  @@index([rating])
  @@index([createdAt])
}
```

## 3. Enhanced Enums

```prisma
enum UserRole {
  USER
  ADMIN
  MODERATOR
}

enum TaskStatus {
  DRAFT
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  EXPIRED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskCategory {
  DELIVERY
  CLEANING
  REPAIR
  TUTORING
  GARDENING
  MOVING
  PET_CARE
  TECH_SUPPORT
  OTHER
}

enum Provider {
  GOOGLE
  FACEBOOK
  APPLE
  CREDENTIALS
}
```

## 4. Additional Security & Audit Fields

### User Model Enhancements

```prisma
model User {
  // ... existing fields

  // Security fields
  lastLoginAt          DateTime?
  passwordResetToken   String?           @db.VarChar(255)
  passwordResetAt      DateTime?
  failedLoginCount     Int               @default(0) @db.SmallInt
  lockedAt             DateTime?
  emailVerifiedAt      DateTime?

  // Additional profile fields
  phone                String?           @db.VarChar(20)
  bio                  String?           @db.Text

  // Audit fields
  deletedAt            DateTime?
  createdBy            String?
  updatedBy            String?
  deletedBy            String?
}
```

### Task Model Enhancements

```prisma
model Task {
  // ... existing fields

  // Enhanced task fields
  category              TaskCategory
  priority              TaskPriority     @default(MEDIUM)
  latitude              Float?           @db.DoublePrecision
  longitude             Float?           @db.DoublePrecision
  estimatedDuration     Int?             @db.SmallInt // in minutes
  maxApplicants         Int?             @db.SmallInt @default(10)
  expiresAt             DateTime?

  // Audit fields
  deletedAt             DateTime?
  createdBy             String?
  updatedBy             String?
  deletedBy             String?
}
```

### Application Model Enhancements

```prisma
model Application {
  // ... existing fields

  // Enhanced fields
  estimatedCompletion   DateTime?
  rejectionReason       String?           @db.Text
  withdrawalReason      String?           @db.Text

  // Audit fields
  createdBy             String?
  updatedBy             String?

  // Prevent duplicate applications
  @@unique([applicantId, taskId], name: "unique_application_per_task")
}
```

## 5. Cascade Behaviors

```prisma
model Task {
  postedBy    User @relation(fields: [postedById], references: [id], onDelete: Cascade)
}

model Application {
  applicant   User @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  task        Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model Review {
  author      User @relation("ReviewAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  recipient   User @relation("ReviewRecipient", fields: [recipientId], references: [id], onDelete: Cascade)
  task        Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}
```

## 6. Additional Models for Scalability

### Message System

```prisma
model Message {
  id          String   @id @default(cuid())
  content     String   @db.Text
  isRead      Boolean  @default(false)
  readAt      DateTime?

  senderId    String
  sender      User     @relation("MessageSender", fields: [senderId], references: [id], onDelete: Cascade)

  recipientId String
  recipient   User     @relation("MessageRecipient", fields: [recipientId], references: [id], onDelete: Cascade)

  taskId      String?
  task        Task?    @relation(fields: [taskId], references: [id], onDelete: SetNull)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([senderId])
  @@index([recipientId])
  @@index([taskId])
  @@index([isRead])
  @@map("messages")
}
```

### Audit Logging

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  tableName   String   @db.VarChar(100)
  recordId    String   @db.VarChar(50)
  action      String   @db.VarChar(20) // CREATE, UPDATE, DELETE
  oldValues   Json?
  newValues   Json?
  userId      String?
  ipAddress   String?  @db.VarChar(45)
  userAgent   String?  @db.Text
  createdAt   DateTime @default(now())

  @@index([tableName])
  @@index([recordId])
  @@index([action])
  @@index([userId])
  @@map("audit_logs")
}
```

### Settings Management

```prisma
model Setting {
  id          String   @id @default(cuid())
  key         String   @unique @db.VarChar(100)
  value       String   @db.Text
  description String?  @db.Text
  isSystem    Boolean  @default(false)

  createdBy   String?
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([key])
  @@index([isSystem])
  @@map("settings")
}
```

## 7. Business Logic Constraints

While Prisma doesn't support check constraints directly, you should implement these in your application logic or database migrations:

- Rating values between 1-5
- Positive compensation amounts
- Valid email formats
- Password strength requirements
- Maximum application limits per user

## 8. Performance Recommendations

1. **Composite Indexes**: Add indexes for common query patterns
2. **Partial Indexes**: Consider partial indexes for soft-deleted records
3. **Database Views**: Create views for complex queries
4. **Connection Pooling**: Implement proper connection pooling

## Implementation Strategy

1. **Phase 1**: Add indexes and basic field type improvements
2. **Phase 2**: Enhance enums and add security fields
3. **Phase 3**: Implement additional models (Message, AuditLog)
4. **Phase 4**: Add business logic constraints

## Migration Notes

- Use `prisma migrate dev` for development
- Test migrations thoroughly before production
- Consider data migration scripts for existing data
- Backup database before major schema changes

This improved schema follows industry standards for:

- ✅ Data integrity
- ✅ Performance optimization
- ✅ Security best practices
- ✅ Audit trails
- ✅ Scalability
- ✅ Maintainability
