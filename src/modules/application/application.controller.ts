import { RequestHandler } from "express";
import { AppError, asyncHandler, sendResponse } from "../../utils";
import { parseQuery } from "../../utils/query";
import {
  approveApplicationService,
  createApplicationService,
  getAllApplicationsForTaskService,
  getAllMyApplicationsService,
  getApplicationByIdService,
  rejectApplicationService,
  withdrawApplicationService,
} from "./application.service";

const createApplicationController: RequestHandler = asyncHandler(
  async (req, res) => {
    const userId = req.user?.id;
    const taskId = req.params.taskId;
    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }
    if (!taskId) {
      throw new AppError(400, "Task ID is required");
    }

    const applicationData = req.body;

    const application = await createApplicationService(
      userId,
      taskId,
      applicationData,
    );

    return sendResponse(
      res,
      200,
      "Application created successfully",
      application,
    );
  },
);

// getAllMyApplicationsController
const getAllMyApplicationsController: RequestHandler = asyncHandler(
  async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }

    const parsedQuery = parseQuery(req, { maxLimit: 50, defaultLimit: 10 });
    const { data, meta } = await getAllMyApplicationsService(
      userId,
      parsedQuery,
    );

    return sendResponse(
      res,
      200,
      "Fetched all applications successfully",
      data,
      meta,
    );
  },
);

const getAllApplicationsForTaskController: RequestHandler = asyncHandler(
  async (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }
    if (!taskId) {
      throw new AppError(400, "Task ID is required");
    }

    const parsedQuery = parseQuery(req, { maxLimit: 50, defaultLimit: 10 });
    const { data, meta } = await getAllApplicationsForTaskService(
      taskId,
      userId,
      parsedQuery,
    );

    return sendResponse(
      res,
      200,
      "Fetched all applications for task successfully",
      data,
      meta,
    );
  },
);

// getApplicationByIdController
const getApplicationByIdController: RequestHandler = asyncHandler(
  async (req, res) => {
    const applicationId = req.params.applicationId;
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }
    if (!applicationId) {
      throw new AppError(400, "Application ID is required");
    }

    const application = await getApplicationByIdService(applicationId, userId);

    return sendResponse(
      res,
      200,
      "Fetched application successfully",
      application,
    );
  },
);

// approveApplicationController
const approveApplicationController: RequestHandler = asyncHandler(
  async (req, res) => {
    const applicationId = req.params.applicationId;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }
    if (!applicationId) {
      throw new AppError(400, "Application ID is required");
    }

    const updatedApplication = await approveApplicationService(
      applicationId,
      userId,
    );

    return sendResponse(
      res,
      200,
      "Application approved successfully",
      updatedApplication,
    );
  },
);

// rejectApplicationController
const rejectApplicationController: RequestHandler = asyncHandler(
  async (req, res) => {
    const applicationId = req.params.applicationId;
    const userId = req.user?.id;
    const { rejectionReason } = req.body;

    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }
    if (!applicationId) {
      throw new AppError(400, "Application ID is required");
    }

    const updatedApplication = await rejectApplicationService(
      applicationId,
      userId,
      rejectionReason,
    );

    return sendResponse(
      res,
      200,
      "Application rejected !!",
      updatedApplication,
    );
  },
);

// withdrawApplicationController
const withdrawApplicationController: RequestHandler = asyncHandler(
  async (req, res) => {
    const applicationId = req.params.applicationId;
    const userId = req.user?.id;
    const { withdrawalReason } = req.body;

    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }
    if (!applicationId) {
      throw new AppError(400, "Application ID is required");
    }

    const result = await withdrawApplicationService(
      applicationId,
      userId,
      withdrawalReason,
    );

    return sendResponse(res, 200, "Application withdrawn successfully", result);
  },
);

export {
  approveApplicationController,
  createApplicationController,
  getAllApplicationsForTaskController,
  getAllMyApplicationsController,
  getApplicationByIdController,
  rejectApplicationController,
  withdrawApplicationController,
};
