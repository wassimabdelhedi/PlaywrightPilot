
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  email: 'email',
  passwordHash: 'passwordHash',
  fullName: 'fullName',
  role: 'role',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  replacedByTokenId: 'replacedByTokenId',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.ProjectScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  baseUrl: 'baseUrl',
  status: 'status',
  denylistPaths: 'denylistPaths',
  maxCrawlDepth: 'maxCrawlDepth',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiscoveryScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  status: 'status',
  maxDepth: 'maxDepth',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  errorMessage: 'errorMessage',
  createdAt: 'createdAt'
};

exports.Prisma.PageScalarFieldEnum = {
  id: 'id',
  discoveryId: 'discoveryId',
  url: 'url',
  title: 'title',
  depth: 'depth',
  screenshotUrl: 'screenshotUrl',
  createdAt: 'createdAt'
};

exports.Prisma.DomElementScalarFieldEnum = {
  id: 'id',
  pageId: 'pageId',
  type: 'type',
  selector: 'selector',
  label: 'label',
  attributes: 'attributes',
  isVisible: 'isVisible',
  createdAt: 'createdAt'
};

exports.Prisma.ScenarioScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  title: 'title',
  description: 'description',
  priority: 'priority',
  status: 'status',
  businessGoal: 'businessGoal',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TestCaseScalarFieldEnum = {
  id: 'id',
  scenarioId: 'scenarioId',
  filePath: 'filePath',
  sourceCode: 'sourceCode',
  status: 'status',
  generationModel: 'generationModel',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExecutionScalarFieldEnum = {
  id: 'id',
  testCaseId: 'testCaseId',
  status: 'status',
  triggeredById: 'triggeredById',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  durationMs: 'durationMs',
  errorMessage: 'errorMessage',
  createdAt: 'createdAt'
};

exports.Prisma.ExecutionArtifactScalarFieldEnum = {
  id: 'id',
  executionId: 'executionId',
  type: 'type',
  storageUrl: 'storageUrl',
  sizeBytes: 'sizeBytes',
  createdAt: 'createdAt'
};

exports.Prisma.FailureAnalysisScalarFieldEnum = {
  id: 'id',
  executionId: 'executionId',
  rootCause: 'rootCause',
  severity: 'severity',
  suggestedFix: 'suggestedFix',
  confidence: 'confidence',
  analysisModel: 'analysisModel',
  createdAt: 'createdAt'
};

exports.Prisma.SelfHealingSuggestionScalarFieldEnum = {
  id: 'id',
  failureAnalysisId: 'failureAnalysisId',
  originalSelector: 'originalSelector',
  suggestedSelector: 'suggestedSelector',
  reasoning: 'reasoning',
  status: 'status',
  reviewedById: 'reviewedById',
  createdAt: 'createdAt',
  reviewedAt: 'reviewedAt'
};

exports.Prisma.RegressionFlagScalarFieldEnum = {
  id: 'id',
  failureAnalysisId: 'failureAnalysisId',
  description: 'description',
  isConfirmed: 'isConfirmed',
  createdAt: 'createdAt'
};

exports.Prisma.ComparisonRunScalarFieldEnum = {
  id: 'id',
  baseExecutionId: 'baseExecutionId',
  currentExecutionId: 'currentExecutionId',
  summary: 'summary',
  regressionCount: 'regressionCount',
  createdAt: 'createdAt'
};

exports.Prisma.AgentMemoryScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  category: 'category',
  content: 'content',
  embedding: 'embedding',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReportScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  title: 'title',
  summary: 'summary',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
};

exports.ProjectStatus = exports.$Enums.ProjectStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  ARCHIVED: 'ARCHIVED'
};

exports.DiscoveryStatus = exports.$Enums.DiscoveryStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

exports.ElementType = exports.$Enums.ElementType = {
  BUTTON: 'BUTTON',
  LINK: 'LINK',
  FORM: 'FORM',
  INPUT: 'INPUT',
  SELECT: 'SELECT',
  CHECKBOX: 'CHECKBOX',
  RADIO: 'RADIO',
  NAVIGATION: 'NAVIGATION',
  MODAL: 'MODAL',
  TABLE: 'TABLE',
  OTHER: 'OTHER'
};

exports.ScenarioPriority = exports.$Enums.ScenarioPriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

exports.ScenarioStatus = exports.$Enums.ScenarioStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  DEPRECATED: 'DEPRECATED'
};

exports.TestCaseStatus = exports.$Enums.TestCaseStatus = {
  GENERATED: 'GENERATED',
  VALIDATED: 'VALIDATED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  ACTIVE: 'ACTIVE',
  DEPRECATED: 'DEPRECATED'
};

exports.ExecutionStatus = exports.$Enums.ExecutionStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  FLAKY: 'FLAKY',
  TIMEOUT: 'TIMEOUT',
  CANCELLED: 'CANCELLED'
};

exports.ArtifactType = exports.$Enums.ArtifactType = {
  SCREENSHOT: 'SCREENSHOT',
  VIDEO: 'VIDEO',
  TRACE: 'TRACE',
  LOG: 'LOG',
  HAR: 'HAR'
};

exports.Severity = exports.$Enums.Severity = {
  BLOCKER: 'BLOCKER',
  CRITICAL: 'CRITICAL',
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  INFO: 'INFO'
};

exports.SuggestionStatus = exports.$Enums.SuggestionStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  AUTO_APPLIED: 'AUTO_APPLIED'
};

exports.MemoryCategory = exports.$Enums.MemoryCategory = {
  SELECTOR_RELIABILITY: 'SELECTOR_RELIABILITY',
  PAGE_KNOWLEDGE: 'PAGE_KNOWLEDGE',
  FEATURE_MAP: 'FEATURE_MAP',
  FAILURE_PATTERN: 'FAILURE_PATTERN',
  EXPLORATION_STATE: 'EXPLORATION_STATE'
};

exports.Prisma.ModelName = {
  Organization: 'Organization',
  User: 'User',
  RefreshToken: 'RefreshToken',
  PasswordResetToken: 'PasswordResetToken',
  Project: 'Project',
  Discovery: 'Discovery',
  Page: 'Page',
  DomElement: 'DomElement',
  Scenario: 'Scenario',
  TestCase: 'TestCase',
  Execution: 'Execution',
  ExecutionArtifact: 'ExecutionArtifact',
  FailureAnalysis: 'FailureAnalysis',
  SelfHealingSuggestion: 'SelfHealingSuggestion',
  RegressionFlag: 'RegressionFlag',
  ComparisonRun: 'ComparisonRun',
  AgentMemory: 'AgentMemory',
  Report: 'Report'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
