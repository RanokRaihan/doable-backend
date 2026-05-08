import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { buildMeta, buildPrismaQuery, ParsedQuery } from "../../utils/query";
import { paymentSelectFieldsApplicant } from "../payment/payment.constant";
import {
  applicationFilterableFields,
  ApplicationSearchFields,
  applicationSortableFields,
} from "./application.constant";
import {
  CreateApplicationPayload,
  CreateApplicationRequest,
} from "./application.interface";

const createApplicationService = async (
  userId: string,
  taskId: string,
  applicationData: CreateApplicationRequest,
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId, isDeleted: false },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });
  if (!user || !user.id) {
    throw new AppError(404, "User not found");
  }
  if (!user.emailVerified) {
    throw new AppError(
      403,
      "Please verify your email before applying to tasks",
    );
  }
  if (user.profileStatus !== "COMPLETE") {
    throw new AppError(
      403,
      "Please complete your profile before applying to tasks",
    );
  }
  if (!task) {
    throw new AppError(404, "Task not found");
  }

  if (task.status !== "OPEN") {
    throw new AppError(400, "Task is no longer open for applications");
  }

  if (task.postedById === userId) {
    throw new AppError(400, "You cannot apply to your own task.");
  }

  const existingApplication = await prisma.application.findFirst({
    where: {
      applicantId: userId,
      taskId: taskId,
    },
  });

  if (existingApplication) {
    throw new AppError(400, "You have already applied to this task.");
  }

  const payload: CreateApplicationPayload = {
    ...applicationData,
    applicantId: userId,
    taskId: taskId,
  };

  const application = await prisma.application.create({
    data: payload,
    select: {
      id: true,
      message: true,
      proposedCompensation: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return application;
};

const getAllMyApplicationsService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
    searchFields: ApplicationSearchFields,
    filterFields: applicationFilterableFields,
    sortFields: applicationSortableFields,
  });

  const mergedWhere = {
    ...where,
    applicantId: userId,
  };

  if (parsedQuery.search.searchTerm) {
    const searchTerm = parsedQuery.search.searchTerm;
    mergedWhere.OR = [
      {
        message: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        task: {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      },
      {
        task: {
          description: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      },
    ];
    delete mergedWhere.message;
  }

  const queryOptions: any = {
    where: mergedWhere,
    skip,
    take,
    select: {
      id: true,
      message: true,
      proposedCompensation: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      task: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          postedById: true,
        },
      },
    },
  };

  if (orderBy) {
    queryOptions.orderBy = orderBy;
  }

  const [applications, totalCount] = await Promise.all([
    prisma.application.findMany(queryOptions),
    prisma.application.count({ where: mergedWhere }),
  ]);

  const processedApplications = (applications as any[]).map((app) => {
    if (app.task.status === "OPEN" || app.status === "APPROVED") {
      return app;
    }
    const { status: _taskStatus, ...taskWithoutStatus } = app.task;
    return { ...app, task: taskWithoutStatus };
  });

  const meta = buildMeta(totalCount, parsedQuery.pagination);
  return { data: processedApplications, meta };
};

const getAllApplicationsForTaskService = async (
  taskId: string,
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId, isDeleted: false },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }
  if (task.postedById !== userId) {
    throw new AppError(
      403,
      "Forbidden: You are not authorized to view these applications",
    );
  }

  const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
    searchFields: ApplicationSearchFields,
    filterFields: applicationFilterableFields,
    sortFields: applicationSortableFields,
  });

  const mergedWhere = {
    ...where,
    taskId: taskId,
  };

  if (parsedQuery.search.searchTerm) {
    const searchTerm = parsedQuery.search.searchTerm;
    mergedWhere.OR = [
      {
        message: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        applicant: {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      },
    ];
    delete mergedWhere.message;
  }

  const queryOptions: any = {
    where: mergedWhere,
    skip,
    take,
    select: {
      id: true,
      message: true,
      proposedCompensation: true,
      status: true,
      withdrawalReason: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      applicant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  };

  if (orderBy) {
    queryOptions.orderBy = orderBy;
  }

  const [applications, totalCount] = await Promise.all([
    prisma.application.findMany(queryOptions),
    prisma.application.count({ where: mergedWhere }),
  ]);

  const meta = buildMeta(totalCount, parsedQuery.pagination);
  return { data: applications, meta };
};

const getApplicationByIdService = async (
  applicationId: string,
  userId: string,
) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          postedById: true,
          postedBy: {
            select: { id: true, name: true, image: true },
          },
        },
      },
      applicant: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (
    application.applicant.id !== userId &&
    application.task.postedById !== userId
  ) {
    throw new AppError(
      403,
      "Forbidden: You are not authorized to view this application",
    );
  }

  if (
    application.task.status === "PAYMENT_INITIATED" &&
    application.status === "APPROVED"
  ) {
    const applicationWithPayment = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            postedById: true,
            postedBy: {
              select: { id: true, name: true, image: true },
            },
            payments: {
              select: {
                ...paymentSelectFieldsApplicant,
              },
            },
          },
        },
        applicant: {
          select: { id: true, name: true, image: true },
        },
      },
    });
    return applicationWithPayment;
  }

  if (application.task.status !== "OPEN" && application.status !== "APPROVED") {
    const { status: _taskStatus, ...taskWithoutStatus } = application.task;
    return { ...application, task: taskWithoutStatus };
  }
  return application;
};

const approveApplicationService = async (
  applicationId: string,
  userId: string,
) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      task: true,
    },
  });

  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (application.task.postedById !== userId) {
    throw new AppError(
      403,
      "Forbidden: You are not authorized to approve this application",
    );
  }

  if (application.status !== "PENDING") {
    throw new AppError(
      400,
      `Cannot approve application with ${application.status.toLowerCase()} status`,
    );
  }
  if (application.task.status !== "OPEN") {
    throw new AppError(400, "Task is no longer open");
  }

  const updatedApplication = await prisma.$transaction(async (tx) => {
    const alreadyApprovedApplication = await tx.application.findFirst({
      where: {
        taskId: application.taskId,
        status: "APPROVED",
      },
    });

    if (alreadyApprovedApplication) {
      throw new AppError(400, "This task already has an approved application");
    }

    const app = await tx.application.update({
      where: { id: applicationId },
      data: { status: "APPROVED" },
    });

    await tx.application.updateMany({
      where: {
        taskId: application.taskId,
        id: { not: applicationId },
        status: "PENDING",
      },
      data: {
        rejectionReason:
          "Your application is no longer under consideration! thank you for applying.",
        status: "CLOSED",
      },
    });

    await tx.task.update({
      where: { id: application.taskId },
      data: {
        status: "ASSIGNED",
        approvedApplicationId: applicationId,
        agreedCompensation: application.proposedCompensation,
      },
    });

    return app;
  });

  return updatedApplication;
};

const rejectApplicationService = async (
  applicationId: string,
  userId: string,
  rejectionReason: string,
) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      task: true,
    },
  });

  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (application.task.postedById !== userId) {
    throw new AppError(
      403,
      "Forbidden: You are not authorized to reject this application",
    );
  }

  if (application.status !== "PENDING") {
    throw new AppError(
      400,
      `Cannot reject application with ${application.status.toLowerCase()} status`,
    );
  }

  const updatedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: { status: "REJECTED", rejectionReason: rejectionReason },
  });

  return updatedApplication;
};

const withdrawApplicationService = async (
  applicationId: string,
  userId: string,
  withdrawalReason: string,
) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      task: true,
      applicant: true,
    },
  });

  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (application.status !== "PENDING") {
    throw new AppError(
      400,
      `this application cannot be withdrawn because it is in  ${application.status.toLocaleLowerCase()} status`,
    );
  }
  if (application.applicantId !== userId) {
    throw new AppError(
      403,
      "Forbidden: You are not authorized to withdraw this application",
    );
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: "WITHDRAWN",
      withdrawalReason: withdrawalReason,
    },
  });

  return { message: "Application withdrawn successfully" };
};

export {
  approveApplicationService,
  createApplicationService,
  getAllApplicationsForTaskService,
  getAllMyApplicationsService,
  getApplicationByIdService,
  rejectApplicationService,
  withdrawApplicationService,
};
