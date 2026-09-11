# Form Builder

A full-stack form creation and response management application built with Next.js, TypeScript, Prisma, PostgreSQL, and Supabase.

The project allows authenticated users to create forms, add and arrange different field types, share public forms, collect responses, upload files, and manage submitted data from a private dashboard.

## Features

### Form Management

* Create forms with a title and description
* Edit form details
* Duplicate forms
* Delete forms
* Generate unique public form slugs
* View form settings and public form links

### Form Fields

Supports multiple field types:

* Short Text
* Name
* Long Text
* Email
* Number
* Date
* Select
* Radio
* Checkbox
* File Upload

Fields can be:

* Added
* Edited
* Deleted
* Reordered
* Marked as required
* Configured with validation rules

### Public Forms

Each form receives a public URL that can be shared with respondents.

Public forms support:

* Text responses
* Name fields
* Email validation
* Number validation
* Date fields
* Select and radio options
* Checkbox responses
* File uploads
* Required-field validation

### Response Management

Authenticated form owners can:

* View submissions
* View individual answers
* Preview uploaded images
* Open uploaded documents
* Download uploaded files
* Export responses as CSV

### Authentication

Authentication is handled with Supabase Auth.

Users can:

* Sign up
* Log in
* Log out
* Access only their own forms and responses

### File Uploads

Uploaded files are stored in a private Supabase Storage bucket.

The application includes:

* File type validation
* File size validation
* Total upload size limits
* Private storage
* Short-lived signed URLs
* Secure file access checks
* Cleanup of uploaded files when a form is deleted

Supported upload types include:

* JPG
* JPEG
* PNG
* WebP
* PDF
* DOC
* DOCX

## Security

Security was considered throughout the backend rather than relying only on client-side validation.

### Authorization

Form ownership is checked on protected API routes and pages.

Users cannot access another user's:

* Forms
* Form fields
* Submissions
* Responses
* Uploaded files
* CSV exports

### Server-Side Validation

Input is validated on the server before being written to the database.

Validation includes:

* Field types
* Required fields
* Text length
* Number ranges
* Checkbox limits
* Name fields
* Email format
* File type
* File size
* Answer count

### Rate Limiting

API endpoints include request rate limiting to reduce abuse and excessive requests.

### CSV Injection Protection

CSV exports are protected against spreadsheet formula injection by handling values that could otherwise be interpreted as formulas by spreadsheet applications.

### Private File Storage

Uploaded files are not publicly accessible.

File access goes through an authenticated server-side route that verifies:

1. The current user owns the form.
2. The file belongs to an answer.
3. The answer belongs to a submission.
4. The submission belongs to the requested form.

Only after these checks is a short-lived signed URL generated.

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Next.js App Router
* Next.js API routes
* Prisma ORM
* PostgreSQL

### Authentication and Storage

* Supabase Auth
* Supabase Storage

### Database

PostgreSQL is hosted through Supabase.

The database contains models for:

* Users
* Forms
* Form fields
* Submissions
* Answers
* File attachments

## Project Structure

```text
formbuilder/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   └── forms/
│   ├── forms/
│   │   ├── [formId]/
│   │   │   ├── edit/
│   │   │   └── responses/
│   │   ├── new/
│   │   └── view/
│   ├── login/
│   ├── signup/
│   └── page.tsx
│
├── components/
│
├── lib/
│   ├── db.ts
│   ├── rateLimit.ts
│   └── supabase/
│       ├── admin.ts
│       ├── client.ts
│       └── server.ts
│
├── prisma/
│   ├── contract.prisma
│   ├── contract.json
│   └── contract.d.ts
│
├── migrations/
│
├── public/
│
├── proxy.ts
├── prisma.config.ts
├── package.json
└── README.md
```

## Database Design

The application uses a relational PostgreSQL database.

The main relationships are:

```text
User
 │
 └── Form
      │
      ├── FormField
      │      │
      │      └── Answer
      │
      └── Submission
             │
             └── Answer
                    │
                    └── FileAttachment
```

This structure allows one form to have many fields and submissions, while each submission can contain multiple answers.

File attachments are linked to individual answers so uploaded files remain associated with the field and submission that produced them.

## Running Locally

Clone the repository:

```bash
git clone https://github.com/Temitope8-tech/formbuilder.git
```

Move into the project:

```bash
cd formbuilder
```

Install dependencies:

```bash
npm install
```

Create a `.env` file and configure the required database and Supabase environment variables.

Then start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

The application requires environment variables for:

* PostgreSQL database connection
* Supabase project URL
* Supabase publishable key
* Supabase service role key

Secret keys should never be committed to the repository.

## Deployment

The application is deployed using Vercel.

The production application uses:

* Vercel for hosting
* Supabase PostgreSQL for the database
* Supabase Auth for authentication
* Supabase Storage for private file uploads

Database migrations are tracked in the repository so the database structure can be reproduced when deploying the application.

## What I Learned

This project helped me move beyond building individual frontend pages and understand how the different parts of a full-stack application work together.

Some of the main areas I worked with include:

* Next.js App Router
* TypeScript
* REST-style API routes
* PostgreSQL database design
* Prisma
* Authentication
* Authorization
* Server-side validation
* File storage
* Signed URLs
* Rate limiting
* Database migrations
* CSV generation
* Responsive UI
* Production deployment

The security side was particularly useful because it required thinking about what a user should be allowed to access rather than only what the interface allows them to click.

## Future Improvements

Potential future improvements include:

* Form templates
* More advanced field validation
* Better form customization
* Submission search and filtering
* Pagination for large response sets
* Improved analytics
* Email notifications
* Form closing and response limits
* More advanced file validation
* Additional account and team features

## Author

**Temitope Omotolani**

Cybersecurity student and developer interested in cybersecurity, software development, and building practical systems.
