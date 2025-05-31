# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/12412d71-e46c-4ee1-9c80-759b926d0b8a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/12412d71-e46c-4ee1-9c80-759b926d0b8a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
# For local development API:
npm run dev:local

# For production API:
npm run dev:prod

# Default (uses the environment from .env):
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## API Environment Configuration

This project uses environment variables to manage API endpoints, making it easy to switch between local development and production environments.

### Available environments:

- **Development**: Points to local API (`http://localhost:3000`)  
  Run with: `npm run dev:local`

- **Production**: Points to production API (`https://marketmirror-api.onrender.com`)  
  Run with: `npm run dev:prod`

### How it works:

- API endpoints are configured using the `VITE_API_URL` environment variable
- All API requests use this variable: `` `${import.meta.env.VITE_API_URL}/endpoint` ``
- No hardcoded URLs - switching environments is as simple as using a different npm script

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/12412d71-e46c-4ee1-9c80-759b926d0b8a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
