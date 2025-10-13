This is an excellent initiative. Establishing a strict, comprehensive "rulebook" for AI coding agents is crucial for ensuring the quality, security, and performance of a specialized application. Given the use case—a React Native iOS app for property adjusters utilizing workflows, LiDAR, and AI camera capture—these rules are vital for handling sensitive data and managing complex hardware interactions.
Here is a detailed rulebook I recommend implementing for any AI coding agents contributing to this application.

AI Agent Rulebook: React Native iOS Property Inspection App


1. Foundational Principles

All generated code must adhere to these core tenets:
  1	Reliability and Stability: The application is a professional tool. Stability is paramount. Code must include robust error handling, anticipate edge cases, and ensure predictable behavior.
  2	Security and Privacy by Design: As the app handles PII (Personally Identifiable Information) and sensitive claim data, security must be integral, adhering to the principle of least privilege.
  3	Performance: The app must remain responsive, particularly during intensive operations like LiDAR scanning, AI model processing, and data synchronization.
  4	Maintainability and Scalability: Code must be clean, modular, strictly typed, and follow established architectural patterns.
  5	iOS Native Experience: The application must strictly adhere to Apple’s Human Interface Guidelines (HIG) to provide an intuitive, high-quality iOS experience.

2. Architecture and Technology Stack

  1	TypeScript Mandate: All code must be written in TypeScript.
  ◦	The project's tsconfig.json must have "strict": true enabled.
  ◦	The use of any is strictly prohibited unless explicitly justified for interfacing with untyped third-party libraries.
  2	Functional Components Only: Use functional components and Hooks (useState, useEffect, useMemo, useCallback) exclusively. Class components are prohibited, except where strictly required for Error Boundaries.
  3	State Management:
  ◦	Global/Client State: Utilize the designated centralized solution (e.g., Redux Toolkit or Zustand). Keep the state normalized and minimal.
  ◦	Server State: Use TanStack Query (React Query) or RTK Query for managing server data, API interactions, caching, and synchronization.1  
  4	Offline-First Mandate: Adjusters often work in low-connectivity areas. All features must be designed to function without network access.
  ◦	Utilize a robust local database (e.g., Realm, WatermelonDB) for persistence.
  ◦	Implement a reliable background synchronization strategy with conflict resolution capabilities.
  5	Separation of Concerns: Strictly separate UI (Components), business logic (Hooks/Services), and data access (Repositories/APIs). UI components must remain declarative.
  6	Modular Structure: Adhere to a feature-based or domain-driven folder structure (e.g., /src/features/Capture, /src/features/Inspections).

3. Code Quality and Conventions

  1	Linting and Formatting: Enforce strict ESLint rules (e.g., airbnb-typescript or plugin:@typescript-eslint/recommended) and Prettier. AI-generated code must pass these checks without errors or warnings.
  2	Naming Conventions:
  ◦	Components, Types, Interfaces: PascalCase.
  ◦	Functions, Variables, Hooks: camelCase.
  ◦	Constants: UPPER_SNAKE_CASE.
  3	Clarity and Complexity: Prioritize readable code over concise or clever code. Components exceeding 150 lines or having high cyclomatic complexity must be refactored according to the Single Responsibility Principle.
  4	Imports: Use absolute imports configured via tsconfig.json (e.g., @/components/Button). Sort imports logically (external libraries, then internal modules).

4. Security and Data Integrity

This is critical for insurance applications.
  1	Secure Storage: Never use AsyncStorage for sensitive data (Auth tokens, PII, API keys). Utilize react-native-keychain to leverage the secure iOS Keychain.
  2	Encryption: All PII and claim data must be encrypted at rest (on the device) and in transit (using TLS 1.2+).
  3	Network Security: Implement SSL/Certificate Pinning for all API communications to mitigate Man-in-the-Middle (MITM) attacks.2  
  4	Immutable Audit Trails: Data captured in the field (photos, measurements, LiDAR scans) must be treated as immutable source data. Any modifications or AI enhancements must be stored as metadata or separate layers, preserving the original data integrity.
  5	Input Validation: Validate and sanitize all data inputs from users, APIs, and external files.

5. Performance Optimization

Performance is critical when utilizing LiDAR and real-time AI processing.
  1	Thread Management (Do Not Block the JS Thread): Computationally intensive tasks (LiDAR point cloud processing, AI model inference, large file encryption) must be offloaded from the JavaScript thread to native modules (Swift/Objective-C).
  2	Memoization: Correctly implement React.memo, useMemo, and useCallback to prevent unnecessary re-renders.
  3	List Virtualization: Use optimized list components like FlashList (by Shopify) or FlatList for all dynamic data sets. Implement keyExtractor and minimize calculations in render items.
  4	Asset Optimization: Use optimized image handling (e.g., react-native-fast-image). Compress images and media appropriately before storage and upload.
  5	Hermes Engine: Ensure all JavaScript is optimized for the Hermes engine.

6. Specialized Features (LiDAR, Camera, AI)

  1	Hardware Access:
  ◦	Camera: Utilize react-native-vision-camera for advanced capture features and real-time frame processing required by AI features.
  ◦	LiDAR/ARKit: Access LiDAR capabilities through well-defined, strictly typed React Native bridges to ARKit.
  2	AI/ML Execution (Core ML): AI models must be optimized for mobile execution by converting them to Apple's Core ML format.3 This ensures optimal performance, reduces battery consumption, and enhances privacy by keeping processing on-device.  
  3	Resource Management: Ensure that camera and LiDAR sessions are explicitly started and stopped when not in use to conserve battery and free up hardware resources.
  4	Graceful Degradation: Ensure the application functions correctly on iOS devices without LiDAR sensors, providing alternative workflows where necessary.
  5	Permissions: Handle permissions explicitly using react-native-permissions, requesting access contextually with clear justifications.

7. UI/UX and Accessibility

  1	Design System Adherence: All UI elements must utilize established design tokens (colors, typography, spacing). Hardcoded style values are prohibited.
  2	Styling Methodology: Use a consistent approach (e.g., StyleSheet.create for optimization, or a standardized UI library). Avoid inline styles in render methods.
  3	Accessibility (A11y): The application must aim for WCAG 2.1 AA compliance.
  ◦	All interactive elements must have appropriate accessibilityRole and accessibilityLabel attributes.
  ◦	The application must be navigable and usable via iOS VoiceOver.
  4	Responsiveness: Ensure layouts adapt correctly across all supported iOS devices (iPhones and iPads).

8. Testing and Reliability

  1	Test Strategy: Implement a comprehensive testing strategy (aim for >80% coverage).
  ◦	Unit Tests (Jest): All utility functions, custom hooks, and complex business logic must be tested.
  ◦	Integration Tests (React Native Testing Library): Test component interactions, state changes, and asynchronous operations.
  ◦	E2E Testing (Detox or Maestro): Generate E2E test scripts for critical workflows (login, inspection capture, data synchronization).4  
  2	Mocking: All external dependencies (APIs, native modules, hardware sensors) must be mocked during testing.
  3	Error Reporting: Implement comprehensive error boundaries and centralized logging (e.g., Sentry, Crashlytics).5 Errors must be caught, sanitized (removing PII), and reported.  

9. Dependencies and Documentation

  1	Dependency Management: Minimize third-party dependencies. Any new dependency introduced by an AI agent must be vetted for security vulnerabilities (e.g., Snyk, npm audit), active maintenance, and license compatibility.
  2	JSDoc: All functions, custom hooks, and complex interfaces must include comprehensive JSDoc comments explaining their purpose, parameters, and return values.
