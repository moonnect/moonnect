# Project Rules and Milestones

## Milestones

### [완성1] (Final 1)
- **Status**: Saved on 2026-04-30
- **Description**: The final polished version with optimized liquid glass UI, complete Role & Tasks data, collection grouping, and gallery features.
- **Key Features**: 
  - **Apple-style Liquid Glass**: Refined `backdrop-blur-3xl` and transparent gradients for buttons and modals.
  - **Collection Grouping**: SONY (Jeju/Daegwallyeong) and Flovit items grouped into interactive series.
  - **Full Dataset**: Completed ROLE & TASKS for CONTENTS, PUBLIC, MEDICAL, ART, and COMMERCE categories.
  - **Interactive Components**: Modal galleries for photos, embedded players for videos, and collection browsing modals.
  - **Floating UI**: Refined "Back to Top" button with superior depth and motion.

### [최종 포트폴리오] (Final Portfolio)
- **Status**: Saved on 2026-07-03
- **Description**: The ultimate customized version featuring fully responsive layouts, optimized asset compression ratios for fast performance, interactive photo modals, GitHub backup copy tools, and pristine metadata.
- **Key Features**:
  - **GitHub Deployment Support**: Interactive admin utility tab allowing users to export their customized localStorage JSON data to the clipboard.
  - **Asset Compression Tweak**: Optimized upload resizing (down to 900px, 0.65 quality) to avoid local storage overflow issues.
  - **Photo Category Parsing**: Enhanced robust case-insensitive check to properly render BRAND PHOTO and other photo-based gallery modes.
  - **Durable Backup File**: Complete initial data structure preserved in `/src/constants.final_portfolio.ts`.

## User Instructions
- If the user says "[완성1] 로 되돌려줘" (Revert to [Final 1]), the agent must restore the state to this specific version.
- If the user says "[최종 포트폴리오] 상태로 되돌려줘" (Revert to [Final Portfolio]), the agent must copy the contents of `/src/constants.final_portfolio.ts` back into `/src/constants.ts` and ensure all related source files are restored to their 2026-07-03 state.
- Previous site versions ([사이트1], [사이트2], [사이트3]) are replaced by these unified milestones.
