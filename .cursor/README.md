# AdoptDontShop Cursor AI Configuration

This directory contains Cursor AI prompt configurations for the AdoptDontShop project. These prompts help Cursor AI understand the project's requirements, coding standards, and best practices.

## Structure

- `settings.json` - Main configuration file for Cursor AI
- `prompts/` - Directory containing all the specialized prompt files

## Prompt Types

The configuration includes two types of prompts:

1. **Project Prompt** - The main prompt that provides an overview of the project
2. **File Prompts** - Specialized prompts that apply to specific file patterns
3. **Contextual Prompts** - Prompts that can be invoked in specific contexts

## Available Prompts

- **Main Guidelines** - Overall project guidelines and prime directives
- **Decision Logging** - Mandatory process for documenting all technical decisions
- **Code Standards** - TypeScript, HTML/CSS, and folder structure standards
- **Database Standards** - PostgreSQL and Sequelize guidelines
- **Security Guidelines** - Security best practices
- **Performance Guidelines** - Performance optimization techniques
- **Testing Requirements** - Testing strategies and requirements
- **Edit Protocol** - Protocol for making large file edits
- **Documentation Standards** - Documentation requirements
- **Architecture Standards** - API, state management, error handling
- **DevOps Guidelines** - Containers, CI/CD, environments
- **Accessibility Guidelines** - WCAG compliance, a11y

## Usage

Cursor AI will automatically use these prompts based on the file you're working with. The appropriate prompt will be selected based on the file pattern.

For the Edit Protocol, you can specifically ask Cursor to use this protocol when working with large files or complex changes.

## Updating Prompts

Feel free to modify these prompts as the project evolves. Make sure to update both the prompt files and the `settings.json` configuration when making changes.
