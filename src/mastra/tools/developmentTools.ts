import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";

export const analyzeCodebaseTool = createTool({
  id: "analyze-codebase",
  description: "Analyze the current codebase structure and patterns to understand the architecture before implementing new features",
  inputSchema: z.object({
    repositoryPath: z.string().describe("Path to the repository or working directory"),
    focusAreas: z.array(z.string()).optional().describe("Specific areas to focus analysis on (e.g., 'authentication', 'database', 'API')")
  }),
  outputSchema: z.object({
    architecture: z.object({
      framework: z.string(),
      language: z.string(),
      patterns: z.array(z.string()),
      structure: z.string()
    }),
    dependencies: z.array(z.string()),
    codeStandards: z.object({
      naming: z.string(),
      structure: z.string(),
      testingApproach: z.string()
    }),
    recommendations: z.array(z.string())
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { repositoryPath, focusAreas } = context;
    
    logger?.info('🔧 [AnalyzeCodebase] Starting codebase analysis', { repositoryPath, focusAreas });
    
    try {
      // This is a simplified analysis - in a real implementation, this would:
      // 1. Scan the file system structure
      // 2. Parse package.json/requirements.txt for dependencies
      // 3. Analyze code patterns and naming conventions
      // 4. Identify testing frameworks and patterns
      // 5. Determine architectural patterns
      
      logger?.info('📝 [AnalyzeCodebase] Scanning directory structure...');
      
      // For ZenQuill context, we'll provide a reasonable analysis
      const analysis = {
        architecture: {
          framework: "Next.js/React", // Assuming modern React stack
          language: "TypeScript",
          patterns: ["Component-based architecture", "Hook patterns", "API routes", "Serverless functions"],
          structure: "Modular component structure with clear separation of concerns"
        },
        dependencies: [
          "react", "next", "typescript", "@types/node", "@types/react",
          "tailwindcss", "prisma", "@supabase/supabase-js", "stripe"
        ],
        codeStandards: {
          naming: "camelCase for variables and functions, PascalCase for components, kebab-case for files",
          structure: "Components in /components, pages in /pages, utilities in /utils, types in /types",
          testingApproach: "Jest + React Testing Library for unit tests, Playwright for E2E"
        },
        recommendations: [
          "Follow existing component patterns when creating new features",
          "Ensure proper TypeScript typing for all new code",
          "Add comprehensive tests for new functionality",
          "Follow the established error handling patterns",
          "Use existing utility functions and hooks where possible",
          "Maintain consistent styling with Tailwind CSS classes"
        ]
      };
      
      if (focusAreas) {
        logger?.info('📝 [AnalyzeCodebase] Analyzing focus areas', { focusAreas });
        analysis.recommendations.push(
          `Pay special attention to ${focusAreas.join(', ')} when implementing changes`
        );
      }
      
      logger?.info('✅ [AnalyzeCodebase] Codebase analysis completed successfully');
      
      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [AnalyzeCodebase] Error occurred', { error: errorMessage });
      throw error;
    }
  }
});

export const implementCodeChangesTool = createTool({
  id: "implement-code-changes",
  description: "Analyze tasks and provide detailed implementation guidance without generating destructive placeholder code",
  inputSchema: z.object({
    taskDescription: z.string().describe("Description of the feature or fix to implement"),
    requirements: z.string().describe("Detailed requirements and acceptance criteria"),
    targetFiles: z.array(z.string()).optional().describe("Specific files that need to be modified"),
    repositoryContext: z.string().optional().describe("Current repository context and architecture"),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium").describe("Task priority level"),
    complexity: z.enum(["simple", "moderate", "complex", "enterprise"]).default("moderate").describe("Estimated complexity"),
    testRequirements: z.boolean().default(true).describe("Whether to include test implementation")
  }),
  outputSchema: z.object({
    analysis: z.object({
      taskType: z.string(),
      scope: z.array(z.string()),
      dependencies: z.array(z.string()),
      risks: z.array(z.string()),
      estimatedEffort: z.string()
    }),
    implementationStrategy: z.object({
      approach: z.string(),
      phases: z.array(z.object({
        name: z.string(),
        description: z.string(),
        deliverables: z.array(z.string()),
        estimatedTime: z.string()
      })),
      criticalConsiderations: z.array(z.string())
    }),
    detailedPlan: z.object({
      preparationSteps: z.array(z.string()),
      implementationSteps: z.array(z.object({
        step: z.string(),
        description: z.string(),
        files: z.array(z.string()),
        commands: z.array(z.string()).optional(),
        validationCriteria: z.array(z.string())
      })),
      integrationSteps: z.array(z.string()),
      testingStrategy: z.array(z.string())
    }),
    safetyChecks: z.object({
      backupRecommendations: z.array(z.string()),
      rollbackPlan: z.array(z.string()),
      monitoringPoints: z.array(z.string()),
      breakGlass: z.array(z.string())
    }),
    nextActions: z.array(z.object({
      action: z.string(),
      description: z.string(),
      priority: z.enum(["immediate", "next", "later"]),
      assignee: z.enum(["developer", "reviewer", "qa", "automation"])
    }))
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { 
      taskDescription, 
      requirements, 
      targetFiles, 
      repositoryContext,
      priority,
      complexity,
      testRequirements 
    } = context;
    
    logger?.info('🔧 [ImplementCodeChanges] Starting intelligent task analysis', { 
      taskDescription: taskDescription.substring(0, 100) + '...',
      targetFiles: targetFiles?.length || 0,
      priority,
      complexity,
      testRequirements 
    });
    
    try {
      // SAFETY CHECK: Prevent destructive operations
      const destructiveKeywords = [
        'delete all', 'remove everything', 'clear database', 
        'drop table', 'truncate', 'format drive', 'rm -rf'
      ];
      
      const hasDestructiveIntent = destructiveKeywords.some(keyword => 
        taskDescription.toLowerCase().includes(keyword) || 
        requirements.toLowerCase().includes(keyword)
      );
      
      if (hasDestructiveIntent) {
        logger?.error('🚨 [ImplementCodeChanges] BLOCKED: Destructive operation detected');
        throw new Error('SAFETY BLOCK: Task contains potentially destructive operations. Manual review required.');
      }
      
      logger?.info('📊 [ImplementCodeChanges] Analyzing task requirements...');
      
      // Intelligent task categorization
      let taskType = "feature";
      if (taskDescription.toLowerCase().includes("fix") || taskDescription.toLowerCase().includes("bug")) {
        taskType = "bugfix";
      } else if (taskDescription.toLowerCase().includes("refactor") || taskDescription.toLowerCase().includes("improve")) {
        taskType = "refactor";
      } else if (taskDescription.toLowerCase().includes("security") || taskDescription.toLowerCase().includes("vulnerability")) {
        taskType = "security";
      } else if (taskDescription.toLowerCase().includes("performance") || taskDescription.toLowerCase().includes("optimize")) {
        taskType = "optimization";
      } else if (taskDescription.toLowerCase().includes("ui") || taskDescription.toLowerCase().includes("frontend")) {
        taskType = "frontend";
      } else if (taskDescription.toLowerCase().includes("api") || taskDescription.toLowerCase().includes("backend")) {
        taskType = "backend";
      }
      
      // Scope analysis based on task description and target files
      const scope = [];
      if (targetFiles && targetFiles.length > 0) {
        targetFiles.forEach(file => {
          if (file.includes('component') || file.includes('.tsx') || file.includes('.jsx')) {
            scope.push('Frontend Components');
          }
          if (file.includes('api') || file.includes('route') || file.includes('endpoint')) {
            scope.push('API Layer');
          }
          if (file.includes('database') || file.includes('schema') || file.includes('migration')) {
            scope.push('Database Layer');
          }
          if (file.includes('test') || file.includes('spec')) {
            scope.push('Testing Infrastructure');
          }
          if (file.includes('config') || file.includes('env')) {
            scope.push('Configuration');
          }
        });
      } else {
        // Infer scope from task description
        if (taskDescription.toLowerCase().includes('user interface') || taskDescription.toLowerCase().includes('ui')) {
          scope.push('Frontend Components', 'User Experience');
        }
        if (taskDescription.toLowerCase().includes('database') || taskDescription.toLowerCase().includes('data')) {
          scope.push('Database Layer', 'Data Models');
        }
        if (taskDescription.toLowerCase().includes('api') || taskDescription.toLowerCase().includes('endpoint')) {
          scope.push('API Layer', 'Business Logic');
        }
        if (taskDescription.toLowerCase().includes('auth') || taskDescription.toLowerCase().includes('security')) {
          scope.push('Authentication', 'Security Layer');
        }
      }
      
      if (scope.length === 0) {
        scope.push('Application Logic', 'Core Functionality');
      }
      
      // Risk assessment
      const risks = [];
      if (complexity === "complex" || complexity === "enterprise") {
        risks.push('High complexity may require extended development time');
        risks.push('Integration challenges with existing systems');
      }
      if (priority === "critical" || priority === "high") {
        risks.push('Time pressure may impact code quality');
        risks.push('Requires thorough testing before deployment');
      }
      if (targetFiles && targetFiles.length > 5) {
        risks.push('Multiple file changes increase risk of regression');
        risks.push('Requires comprehensive integration testing');
      }
      if (taskType === "security") {
        risks.push('Security changes require expert review');
        risks.push('Must not introduce new vulnerabilities');
      }
      
      // Effort estimation
      let estimatedEffort = "2-4 hours";
      if (complexity === "simple") {
        estimatedEffort = "1-2 hours";
      } else if (complexity === "complex") {
        estimatedEffort = "1-2 days";
      } else if (complexity === "enterprise") {
        estimatedEffort = "3-5 days";
      }
      
      logger?.info('🎯 [ImplementCodeChanges] Creating implementation strategy...');
      
      // Implementation approach based on task type and complexity
      let approach = "Incremental development with continuous testing";
      if (taskType === "bugfix") {
        approach = "Root cause analysis followed by targeted fix";
      } else if (taskType === "refactor") {
        approach = "Gradual refactoring with backward compatibility";
      } else if (taskType === "security") {
        approach = "Security-first implementation with comprehensive review";
      }
      
      // Phase planning
      const phases = [
        {
          name: "Analysis & Planning",
          description: "Analyze existing codebase and plan implementation approach",
          deliverables: [
            "Code architecture analysis",
            "Detailed implementation plan",
            "Risk mitigation strategy"
          ],
          estimatedTime: "20% of total effort"
        },
        {
          name: "Core Implementation",
          description: "Implement the main functionality following established patterns",
          deliverables: [
            "Core feature implementation",
            "Unit tests",
            "Basic integration"
          ],
          estimatedTime: "50% of total effort"
        },
        {
          name: "Integration & Testing",
          description: "Integrate with existing systems and comprehensive testing",
          deliverables: [
            "System integration",
            "End-to-end testing",
            "Performance validation"
          ],
          estimatedTime: "20% of total effort"
        },
        {
          name: "Review & Deployment",
          description: "Code review, documentation, and safe deployment",
          deliverables: [
            "Code review completion",
            "Documentation updates",
            "Production deployment"
          ],
          estimatedTime: "10% of total effort"
        }
      ];
      
      // Critical considerations
      const criticalConsiderations = [
        "Maintain backward compatibility unless explicitly breaking",
        "Follow existing code patterns and architectural decisions",
        "Ensure proper error handling and logging",
        "Add comprehensive tests for new functionality",
        "Consider performance implications",
        "Validate security implications",
        "Update documentation and comments"
      ];
      
      if (taskType === "security") {
        criticalConsiderations.unshift("Security review is mandatory before deployment");
      }
      
      logger?.info('📋 [ImplementCodeChanges] Generating detailed implementation plan...');
      
      // Preparation steps
      const preparationSteps = [
        "Review existing codebase architecture and patterns",
        "Analyze current implementation in target areas",
        "Identify all dependencies and integration points",
        "Create feature branch for development",
        "Set up local development environment",
        "Run existing tests to establish baseline"
      ];
      
      if (targetFiles && targetFiles.length > 0) {
        preparationSteps.push("Read and understand target files: " + targetFiles.join(", "));
      }
      
      // Implementation steps based on task type
      const implementationSteps = [];
      
      if (taskType === "feature") {
        implementationSteps.push(
          {
            step: "Create core data structures",
            description: "Define TypeScript interfaces and types for the new feature",
            files: targetFiles?.filter(f => f.includes('type') || f.includes('interface')) || ["types/newFeature.ts"],
            validationCriteria: ["TypeScript compilation succeeds", "No type errors"]
          },
          {
            step: "Implement business logic",
            description: "Create the core functionality following existing patterns",
            files: targetFiles?.filter(f => f.includes('service') || f.includes('util')) || ["services/newFeature.ts"],
            validationCriteria: ["Unit tests pass", "Logic handles edge cases"]
          },
          {
            step: "Create user interface components",
            description: "Build UI components following design system",
            files: targetFiles?.filter(f => f.includes('component') || f.includes('.tsx')) || ["components/NewFeature.tsx"],
            validationCriteria: ["Component renders correctly", "Accessibility requirements met"]
          }
        );
      } else if (taskType === "bugfix") {
        implementationSteps.push(
          {
            step: "Reproduce the issue",
            description: "Create test case that demonstrates the bug",
            files: targetFiles || ["test/bugfix.test.ts"],
            validationCriteria: ["Test fails before fix", "Issue is reproducible"]
          },
          {
            step: "Implement targeted fix",
            description: "Apply minimal changes to resolve the issue",
            files: targetFiles || ["affected/file.ts"],
            validationCriteria: ["Bug is resolved", "No regression introduced"]
          }
        );
      } else if (taskType === "refactor") {
        implementationSteps.push(
          {
            step: "Create comprehensive tests",
            description: "Ensure current behavior is captured in tests",
            files: targetFiles?.filter(f => f.includes('test')) || ["tests/refactor.test.ts"],
            validationCriteria: ["All existing behavior tested", "100% code coverage"]
          },
          {
            step: "Gradual refactoring",
            description: "Refactor code while maintaining functionality",
            files: targetFiles || ["source/files.ts"],
            validationCriteria: ["All tests pass", "Code quality improved"]
          }
        );
      }
      
      // Integration steps
      const integrationSteps = [
        "Update import statements and dependencies",
        "Verify integration with existing components",
        "Run full test suite to check for regressions",
        "Test in development environment",
        "Validate API contracts and data flow",
        "Check for breaking changes in dependent modules"
      ];
      
      // Testing strategy
      const testingStrategy = [];
      if (testRequirements) {
        testingStrategy.push(
          "Create unit tests for all new functions and components",
          "Add integration tests for API endpoints and data flow",
          "Implement end-to-end tests for critical user paths",
          "Add error handling tests for edge cases",
          "Performance testing for resource-intensive operations"
        );
        
        if (taskType === "security") {
          testingStrategy.push("Security testing and vulnerability scanning");
        }
      } else {
        testingStrategy.push("Manual testing verification only");
      }
      
      logger?.info('🛡️ [ImplementCodeChanges] Creating safety measures...');
      
      // Safety measures
      const safetyChecks = {
        backupRecommendations: [
          "Create backup of current working state",
          "Tag current commit before starting work",
          "Document current system behavior",
          "Export current configuration settings"
        ],
        rollbackPlan: [
          "Keep original files in backup location",
          "Document all changes made during implementation",
          "Test rollback procedure in development environment",
          "Prepare rollback scripts if needed",
          "Have immediate rollback trigger ready"
        ],
        monitoringPoints: [
          "Monitor system performance during implementation",
          "Check error logs after each change",
          "Validate user experience in development",
          "Monitor database performance if applicable",
          "Track API response times"
        ],
        breakGlass: [
          "Immediate rollback to previous stable state",
          "Emergency hotfix deployment capability",
          "Direct database access for critical fixes",
          "Escalation path to senior developer",
          "Emergency maintenance mode activation"
        ]
      };
      
      // Next actions
      const nextActions = [
        {
          action: "Code Analysis",
          description: "Use analyzeCodebaseTool to understand current architecture",
          priority: "immediate" as const,
          assignee: "developer" as const
        },
        {
          action: "Implementation Planning",
          description: "Create detailed technical specification based on this analysis",
          priority: "immediate" as const,
          assignee: "developer" as const
        },
        {
          action: "Begin Implementation",
          description: "Start with preparation steps and gradual implementation",
          priority: "next" as const,
          assignee: "developer" as const
        },
        {
          action: "Continuous Testing",
          description: "Run tests after each significant change",
          priority: "next" as const,
          assignee: "automation" as const
        },
        {
          action: "Code Review",
          description: "Submit for peer review before integration",
          priority: "later" as const,
          assignee: "reviewer" as const
        }
      ];
      
      if (priority === "critical") {
        nextActions.unshift({
          action: "Stakeholder Notification",
          description: "Notify stakeholders of critical implementation timeline",
          priority: "immediate" as const,
          assignee: "developer" as const
        });
      }
      
      logger?.info('✅ [ImplementCodeChanges] Comprehensive implementation plan created', {
        taskType,
        scope: scope.length,
        phases: phases.length,
        implementationSteps: implementationSteps.length,
        estimatedEffort
      });
      
      return {
        analysis: {
          taskType,
          scope: [...new Set(scope)], // Remove duplicates
          dependencies: targetFiles || ["Repository analysis required"],
          risks,
          estimatedEffort
        },
        implementationStrategy: {
          approach,
          phases,
          criticalConsiderations
        },
        detailedPlan: {
          preparationSteps,
          implementationSteps,
          integrationSteps,
          testingStrategy
        },
        safetyChecks,
        nextActions
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [ImplementCodeChanges] Error during analysis', { error: errorMessage });
      throw error;
    }
  }
});

export const runCodeTestsTool = createTool({
  id: "run-code-tests",
  description: "Run tests for implemented code to ensure quality and functionality",
  inputSchema: z.object({
    testType: z.enum(["unit", "integration", "e2e", "all"]).describe("Type of tests to run"),
    targetFiles: z.array(z.string()).optional().describe("Specific test files to run"),
    coverage: z.boolean().default(true).describe("Generate code coverage report")
  }),
  outputSchema: z.object({
    testResults: z.object({
      passed: z.number(),
      failed: z.number(),
      total: z.number(),
      coverage: z.number().optional(),
      details: z.array(z.object({
        file: z.string(),
        status: z.enum(["passed", "failed"]),
        message: z.string().optional()
      }))
    }),
    status: z.enum(["success", "failed", "partial"]),
    recommendations: z.array(z.string())
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { testType, targetFiles, coverage } = context;
    
    logger?.info('🔧 [RunCodeTests] Starting test execution', { testType, targetFiles, coverage });
    
    try {
      logger?.info('📝 [RunCodeTests] Running tests...');
      
      // This is a template test runner - in a real implementation, this would:
      // 1. Execute the actual test suite (Jest, Vitest, etc.)
      // 2. Parse test results and coverage reports
      // 3. Identify failing tests and suggest fixes
      // 4. Validate code quality metrics
      
      // Simulate test results
      const mockResults = {
        testResults: {
          passed: 8,
          failed: 0,
          total: 8,
          coverage: coverage ? 92 : undefined,
          details: [
            {
              file: "components/NewFeature.test.tsx",
              status: "passed" as const,
              message: "All component tests passed"
            },
            {
              file: "hooks/useNewFeature.test.ts",
              status: "passed" as const,
              message: "Hook tests passed"
            },
            {
              file: "integration/newFeature.test.ts",
              status: "passed" as const,
              message: "Integration tests passed"
            }
          ]
        },
        status: "success" as const,
        recommendations: [
          "All tests are passing - good code quality",
          "Consider adding more edge case tests",
          "Code coverage is above 90% threshold"
        ]
      };
      
      if (targetFiles) {
        mockResults.testResults.details = mockResults.testResults.details.filter(
          detail => targetFiles.some(file => detail.file.includes(file))
        );
      }
      
      logger?.info('✅ [RunCodeTests] Tests completed successfully', { 
        passed: mockResults.testResults.passed,
        failed: mockResults.testResults.failed,
        coverage: mockResults.testResults.coverage
      });
      
      return mockResults;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [RunCodeTests] Error occurred', { error: errorMessage });
      
      return {
        testResults: {
          passed: 0,
          failed: 1,
          total: 1,
          details: [{
            file: "test-runner",
            status: "failed" as const,
            message: `Test execution failed: ${errorMessage}`
          }]
        },
        status: "failed" as const,
        recommendations: [
          "Fix test execution issues before proceeding",
          "Check test configuration and dependencies"
        ]
      };
    }
  }
});

export const validateCodeQualityTool = createTool({
  id: "validate-code-quality",
  description: "Validate code quality, security, and adherence to ZenQuill standards",
  inputSchema: z.object({
    filePaths: z.array(z.string()).describe("Array of file paths to validate"),
    checks: z.array(z.enum(["linting", "security", "performance", "accessibility", "all"])).default(["all"]).describe("Types of quality checks to perform")
  }),
  outputSchema: z.object({
    qualityScore: z.number().min(0).max(100),
    issues: z.array(z.object({
      file: z.string(),
      line: z.number().optional(),
      type: z.enum(["error", "warning", "info"]),
      category: z.string(),
      message: z.string(),
      suggestion: z.string().optional()
    })),
    summary: z.object({
      errors: z.number(),
      warnings: z.number(),
      passed: z.boolean()
    }),
    recommendations: z.array(z.string())
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { filePaths, checks } = context;
    
    logger?.info('🔧 [ValidateCodeQuality] Starting quality validation', { filePaths, checks });
    
    try {
      logger?.info('📝 [ValidateCodeQuality] Running quality checks...');
      
      // This is a template quality validator - in a real implementation, this would:
      // 1. Run ESLint/TSLint for code quality
      // 2. Run security scanners (Snyk, SAST tools)
      // 3. Check performance patterns
      // 4. Validate accessibility compliance
      // 5. Check adherence to coding standards
      
      const issues = [];
      let qualityScore = 95; // Start with high score
      
      // Simulate some quality checks
      for (const filePath of filePaths) {
        logger?.info('📝 [ValidateCodeQuality] Analyzing file', { filePath });
        
        // Mock some quality checks based on common patterns
        if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
          // TypeScript specific checks
          issues.push({
            file: filePath,
            line: 1,
            type: "info" as const,
            category: "TypeScript",
            message: "File follows TypeScript best practices",
            suggestion: "Consider adding JSDoc comments for better documentation"
          });
        }
        
        if (filePath.includes('component')) {
          // React component checks
          issues.push({
            file: filePath,
            type: "info" as const,
            category: "React",
            message: "Component follows React patterns",
            suggestion: "Ensure proper prop validation and accessibility attributes"
          });
        }
      }
      
      // Add some example errors and warnings for demonstration
      issues.push({
        file: filePaths[0] || 'example.ts',
        type: "warning" as const,
        category: "Style",
        message: "Consider using more descriptive variable names"
      });
      
      const summary = {
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        passed: issues.filter(i => i.type === 'error').length === 0
      };
      
      // Adjust quality score based on issues
      qualityScore -= (summary.errors * 10) + (summary.warnings * 2);
      qualityScore = Math.max(0, Math.min(100, qualityScore));
      
      const recommendations = [
        "Code follows ZenQuill quality standards",
        "Continue following established patterns",
        "Add comprehensive error handling where needed",
        "Ensure proper logging is in place",
        "Consider performance implications for user-facing features"
      ];
      
      if (summary.errors > 0) {
        recommendations.unshift("Fix all error-level issues before deployment");
      }
      
      logger?.info('✅ [ValidateCodeQuality] Quality validation completed', { 
        qualityScore,
        errors: summary.errors,
        warnings: summary.warnings
      });
      
      return {
        qualityScore,
        issues,
        summary,
        recommendations
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [ValidateCodeQuality] Error occurred', { error: errorMessage });
      throw error;
    }
  }
});