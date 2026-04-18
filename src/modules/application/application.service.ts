import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { buildMeta, buildPrismaQuery, ParsedQuery } from "../../utils/query";
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
  try {
    // Fetch task data
    const task = await prisma.task.findUnique({
      where: { id: taskId, isDeleted: false },
    });

    if (!task) {
      throw new AppError(404, "Task not found");
    }

    // Check if task status is still open
    if (task.status !== "OPEN") {
      throw new AppError(400, "Task is no longer open for applications");
    }

    // Check if the poster is not trying to apply to their own task
    if (task.postedById === userId) {
      throw new AppError(400, "You cannot apply to your own task.");
    }

    // Check if the applicant has already applied to the task
    const existingApplication = await prisma.application.findFirst({
      where: {
        applicantId: userId,
        taskId: taskId,
      },
    });

    if (existingApplication) {
      throw new AppError(400, "You have already applied to this task.");
    }

    // Prepare application payload
    const payload: CreateApplicationPayload = {
      ...applicationData,
      applicantId: userId,
      taskId: taskId,
    };
    // Create the application
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
  } catch (error) {
    console.error("Error creating application:", error);
    throw error;
  }
};

const getAllMyApplicationsService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  try {
    const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
      searchFields: ApplicationSearchFields,
      filterFields: applicationFilterableFields,
      sortFields: applicationSortableFields,
    });

    const mergedWhere = {
      ...where,
      applicantId: userId,
    };

    // Handle nested search for task title and description
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
      delete mergedWhere.message; // Remove the direct message search since it's in OR
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

    const meta = buildMeta(totalCount, parsedQuery.pagination);
    return { data: applications, meta };
  } catch (error) {
    console.error("Error fetching applications:", error);
    throw error;
  }
};

// get all application for a task
const getAllApplicationsForTaskService = async (
  taskId: string,
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId, isDeleted: false },
    });

    if (!task) {
      throw new AppError(404, "Task not found");
    }
    // Check if the requester is the task owner
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

    // Handle nested search for applicant name and message
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
      delete mergedWhere.message; // Remove the direct message search since it's in OR
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
  } catch (error) {
    console.error("Error fetching applications for task:", error);
    throw error;
  }
};

// get application by id
const getApplicationByIdService = async (
  applicationId: string,
  userId: string,
) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          omit: {
            approvedApplicationId: true,
            isDeleted: true,
            deletedAt: true,
            deletedBy: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check if the requester is the applicant or the task owner
    if (
      application.applicant.id !== userId &&
      application.task.postedById !== userId
    ) {
      throw new AppError(
        403,
        "Forbidden: You are not authorized to view this application",
      );
    }

    return application;
  } catch (error) {
    console.error("Error fetching application by id:", error);
    throw error;
  }
};

// approve application (for task owner)
const approveApplicationService = async (
  applicationId: string,
  userId: string,
) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        task: true,
      },
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check if the requester is the task owner
    if (application.task.postedById !== userId) {
      throw new AppError(
        403,
        "Forbidden: You are not authorized to approve this application",
      );
    }

    // Check if application is in pending status
    if (application.status !== "PENDING") {
      throw new AppError(
        400,
        `Cannot approve application with ${application.status.toLowerCase()} status`,
      );
    }
    // Check if task is still open
    if (application.task.status !== "OPEN") {
      throw new AppError(400, "Task is no longer open");
    }

    // Check if there are any already approved applications for this task
    const alreadyApprovedApplication = await prisma.application.findFirst({
      where: {
        taskId: application.taskId,
        status: "APPROVED",
      },
    });

    if (alreadyApprovedApplication) {
      throw new AppError(400, "This task already has an approved application");
    }
    let updatedApplication;
    // Use a transaction to approve application, reject others, and update task
    await prisma.$transaction(async (tx) => {
      // Approve the current application
      updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: { status: "APPROVED" },
      });

      // Reject all other pending applications for this task
      await tx.application.updateMany({
        where: {
          taskId: application.taskId,
          id: { not: applicationId },
          status: "PENDING",
        },
        data: {
          rejectionReason:
            "Your application is no longer under consideration! thank you for applying.",
          status: "REJECTED",
        },
      });

      // Update task status to IN_PROGRESS and set approved application details
      await tx.task.update({
        where: { id: application.taskId },
        data: {
          status: "ASSIGNED",
          approvedApplicationId: applicationId,
          agreedCompensation: application.proposedCompensation,
        },
      });
    });
    if (!updatedApplication) {
      throw new AppError(500, "Failed to approve application");
    }
    return updatedApplication;
  } catch (error) {
    console.error("Error approving application:", error);
    throw error;
  }
};

// reject application (for task owner)
const rejectApplicationService = async (
  applicationId: string,
  userId: string,
  rejectionReason: string,
) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        task: true,
      },
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check if the requester is the task owner
    if (application.task.postedById !== userId) {
      throw new AppError(
        403,
        "Forbidden: You are not authorized to reject this application",
      );
    }

    // Check if application is in pending status
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
  } catch (error) {
    console.error("Error rejecting application:", error);
    throw error;
  }
};

// withdraw application (for applicant)
const withdrawApplicationService = async (
  applicationId: string,
  userId: string,
  withdrawalReason: string,
) => {
  try {
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
      // Check if the requester is the applicant
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
  } catch (error) {
    console.error("Error withdrawing application:", error);
    throw error;
  }
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
