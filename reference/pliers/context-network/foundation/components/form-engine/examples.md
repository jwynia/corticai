# Form Engine Examples and Use Cases

## Purpose
This document provides practical examples and comprehensive use cases for the Form Engine component, demonstrating how to implement various form scenarios from simple contact forms to complex multi-step workflows.

## Classification
- **Domain:** Examples & Documentation
- **Stability:** Stable
- **Abstraction:** Practical
- **Confidence:** Established

## Basic Form Examples

### 1. Simple Contact Form

A basic contact form with standard validation:

```typescript
const contactForm: FormDefinition = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "contact_form",
  version: "1.0.0",
  status: "published",
  metadata: {
    title: "Contact Us",
    description: "Get in touch with our team",
    category: "communication",
    tags: ["contact", "basic"],
    version: "1.0.0",
    submitButtonText: "Send Message",
    successMessage: "Thank you for your message! We'll get back to you soon."
  },
  schema: {
    fields: [
      {
        id: "first_name",
        type: "text",
        name: "first_name",
        required: true,
        validation: {
          required: true,
          minLength: 2,
          maxLength: 50,
          pattern: "^[a-zA-Z\\s]+$"
        },
        ui: {
          label: "First Name",
          placeholder: "Enter your first name",
          width: "half",
          order: 1
        }
      },
      {
        id: "last_name",
        type: "text",
        name: "last_name",
        required: true,
        validation: {
          required: true,
          minLength: 2,
          maxLength: 50,
          pattern: "^[a-zA-Z\\s]+$"
        },
        ui: {
          label: "Last Name",
          placeholder: "Enter your last name",
          width: "half",
          order: 2
        }
      },
      {
        id: "email",
        type: "email",
        name: "email",
        required: true,
        validation: {
          required: true,
          format: "email"
        },
        ui: {
          label: "Email Address",
          placeholder: "your.email@example.com",
          helpText: "We'll never share your email with anyone else",
          width: "full",
          order: 3
        }
      },
      {
        id: "subject",
        type: "select",
        name: "subject",
        required: true,
        options: [
          { label: "General Inquiry", value: "general" },
          { label: "Technical Support", value: "support" },
          { label: "Sales Question", value: "sales" },
          { label: "Partnership", value: "partnership" }
        ],
        ui: {
          label: "Subject",
          width: "full",
          order: 4
        }
      },
      {
        id: "message",
        type: "textarea",
        name: "message",
        required: true,
        validation: {
          required: true,
          minLength: 10,
          maxLength: 1000
        },
        ui: {
          label: "Message",
          placeholder: "Please describe your inquiry...",
          helpText: "Maximum 1000 characters",
          width: "full",
          order: 5
        }
      },
      {
        id: "newsletter_signup",
        type: "checkbox",
        name: "newsletter_signup",
        defaultValue: false,
        ui: {
          label: "Subscribe to our newsletter for updates",
          width: "full",
          order: 6
        }
      }
    ],
    layout: {
      type: "grid",
      columns: 2,
      gap: "1rem"
    }
  },
  createdAt: "2025-01-22T10:00:00Z",
  updatedAt: "2025-01-22T10:00:00Z",
  createdBy: "550e8400-e29b-41d4-a716-446655440001",
  updatedBy: "550e8400-e29b-41d4-a716-446655440001"
};
```

### 2. User Registration Form

A comprehensive user registration form with advanced validation:

```typescript
const registrationForm: FormDefinition = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  name: "user_registration",
  version: "1.2.0",
  status: "published",
  metadata: {
    title: "Create Your Account",
    description: "Join our platform today",
    category: "authentication",
    tags: ["registration", "user", "account"],
    version: "1.2.0",
    submitButtonText: "Create Account",
    successMessage: "Account created successfully! Please check your email for verification."
  },
  schema: {
    fields: [
      {
        id: "username",
        type: "text",
        name: "username",
        required: true,
        validation: {
          required: true,
          minLength: 3,
          maxLength: 30,
          pattern: "^[a-zA-Z0-9_]+$",
          custom: [
            {
              type: "uniqueness",
              message: "This username is already taken"
            }
          ]
        },
        ui: {
          label: "Username",
          placeholder: "Choose a unique username",
          helpText: "3-30 characters, letters, numbers, and underscores only",
          width: "full",
          order: 1
        }
      },
      {
        id: "email",
        type: "email",
        name: "email",
        required: true,
        validation: {
          required: true,
          format: "email",
          custom: [
            {
              type: "uniqueness",
              message: "An account with this email already exists"
            }
          ]
        },
        ui: {
          label: "Email Address",
          placeholder: "your.email@example.com",
          width: "full",
          order: 2
        }
      },
      {
        id: "password",
        type: "password",
        name: "password",
        required: true,
        validation: {
          required: true,
          minLength: 8,
          custom: [
            {
              type: "password_strength",
              message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            }
          ]
        },
        ui: {
          label: "Password",
          placeholder: "Create a strong password",
          helpText: "Minimum 8 characters with mixed case, numbers, and symbols",
          width: "full",
          order: 3
        }
      },
      {
        id: "confirm_password",
        type: "password",
        name: "confirm_password",
        required: true,
        validation: {
          required: true,
          custom: [
            {
              type: "field_match",
              params: { matchField: "password" },
              message: "Passwords do not match"
            }
          ]
        },
        ui: {
          label: "Confirm Password",
          placeholder: "Re-enter your password",
          width: "full",
          order: 4
        }
      },
      {
        id: "birth_date",
        type: "date",
        name: "birth_date",
        required: true,
        validation: {
          required: true,
          custom: [
            {
              type: "minimum_age",
              params: { minAge: 13 },
              message: "You must be at least 13 years old to register"
            }
          ]
        },
        ui: {
          label: "Date of Birth",
          width: "half",
          order: 5
        }
      },
      {
        id: "country",
        type: "select",
        name: "country",
        required: true,
        options: [
          { label: "United States", value: "US" },
          { label: "Canada", value: "CA" },
          { label: "United Kingdom", value: "GB" },
          { label: "Germany", value: "DE" },
          { label: "France", value: "FR" },
          { label: "Australia", value: "AU" }
        ],
        ui: {
          label: "Country",
          width: "half",
          order: 6
        }
      },
      {
        id: "terms_accepted",
        type: "checkbox",
        name: "terms_accepted",
        required: true,
        validation: {
          required: true,
          custom: [
            {
              type: "must_be_true",
              message: "You must accept the terms and conditions"
            }
          ]
        },
        ui: {
          label: "I accept the Terms of Service and Privacy Policy",
          width: "full",
          order: 7
        }
      }
    ]
  },
  createdAt: "2025-01-22T10:00:00Z",
  updatedAt: "2025-01-22T10:30:00Z",
  createdBy: "550e8400-e29b-41d4-a716-446655440001",
  updatedBy: "550e8400-e29b-41d4-a716-446655440001"
};
```

## Advanced Form Examples

### 3. Job Application Form with Conditional Logic

A complex job application form demonstrating conditional fields and dynamic sections:

```typescript
const jobApplicationForm: FormDefinition = {
  id: "550e8400-e29b-41d4-a716-446655440003",
  name: "job_application",
  version: "2.1.0",
  status: "published",
  metadata: {
    title: "Job Application",
    description: "Apply for a position at our company",
    category: "hr",
    tags: ["job", "application", "recruitment"],
    version: "2.1.0",
    allowMultipleSubmissions: false,
    saveProgress: true,
    showProgressBar: true
  },
  schema: {
    fields: [
      // Personal Information Section
      {
        id: "personal_info_section",
        type: "section",
        name: "personal_info",
        ui: {
          label: "Personal Information",
          order: 1
        },
        fields: [
          {
            id: "first_name",
            type: "text",
            name: "first_name",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 50
            },
            ui: {
              label: "First Name",
              placeholder: "Enter your first name",
              width: "half",
              order: 1
            }
          },
          {
            id: "last_name",
            type: "text",
            name: "last_name",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 50
            },
            ui: {
              label: "Last Name",
              placeholder: "Enter your last name",
              width: "half",
              order: 2
            }
          },
          {
            id: "email",
            type: "email",
            name: "email",
            required: true,
            validation: {
              required: true,
              format: "email"
            },
            ui: {
              label: "Email Address",
              placeholder: "your.email@example.com",
              width: "full",
              order: 3
            }
          },
          {
            id: "phone",
            type: "tel",
            name: "phone",
            required: true,
            validation: {
              required: true,
              pattern: "^\\+?[1-9]\\d{1,14}$"
            },
            ui: {
              label: "Phone Number",
              placeholder: "+1 (555) 123-4567",
              width: "half",
              order: 4
            }
          },
          {
            id: "linkedin_url",
            type: "url",
            name: "linkedin_url",
            validation: {
              format: "url"
            },
            ui: {
              label: "LinkedIn Profile",
              placeholder: "https://linkedin.com/in/yourprofile",
              width: "half",
              order: 5
            }
          }
        ]
      },

      // Position Information
      {
        id: "position_section",
        type: "section",
        name: "position_info",
        ui: {
          label: "Position Information",
          order: 2
        },
        fields: [
          {
            id: "position_applied",
            type: "select",
            name: "position_applied",
            required: true,
            options: [
              { label: "Software Engineer", value: "software_engineer" },
              { label: "Senior Software Engineer", value: "senior_software_engineer" },
              { label: "Product Manager", value: "product_manager" },
              { label: "UX Designer", value: "ux_designer" },
              { label: "Data Scientist", value: "data_scientist" },
              { label: "DevOps Engineer", value: "devops_engineer" }
            ],
            ui: {
              label: "Position Applied For",
              width: "full",
              order: 1
            }
          },
          {
            id: "years_experience",
            type: "select",
            name: "years_experience",
            required: true,
            options: [
              { label: "0-1 years", value: "0-1" },
              { label: "2-3 years", value: "2-3" },
              { label: "4-5 years", value: "4-5" },
              { label: "6-10 years", value: "6-10" },
              { label: "10+ years", value: "10+" }
            ],
            ui: {
              label: "Years of Experience",
              width: "half",
              order: 2
            }
          },
          {
            id: "salary_expectation",
            type: "currency",
            name: "salary_expectation",
            ui: {
              label: "Salary Expectation (Annual)",
              placeholder: "Enter expected salary",
              width: "half",
              order: 3
            }
          }
        ]
      },

      // Technical Skills (conditional on position)
      {
        id: "technical_skills_section",
        type: "section",
        name: "technical_skills",
        ui: {
          label: "Technical Skills",
          order: 3
        },
        conditions: [
          {
            id: "show_technical_skills",
            condition: {
              field: "position_applied",
              operator: "in",
              value: ["software_engineer", "senior_software_engineer", "data_scientist", "devops_engineer"]
            },
            actions: [
              {
                action: "show",
                target: "technical_skills_section"
              }
            ]
          }
        ],
        fields: [
          {
            id: "programming_languages",
            type: "checkboxgroup",
            name: "programming_languages",
            options: [
              { label: "JavaScript", value: "javascript" },
              { label: "TypeScript", value: "typescript" },
              { label: "Python", value: "python" },
              { label: "Java", value: "java" },
              { label: "C#", value: "csharp" },
              { label: "Go", value: "go" },
              { label: "Rust", value: "rust" },
              { label: "PHP", value: "php" }
            ],
            ui: {
              label: "Programming Languages",
              width: "full",
              order: 1
            }
          },
          {
            id: "frameworks",
            type: "checkboxgroup",
            name: "frameworks",
            options: [
              { label: "React", value: "react" },
              { label: "Vue.js", value: "vue" },
              { label: "Angular", value: "angular" },
              { label: "Node.js", value: "nodejs" },
              { label: "Express.js", value: "express" },
              { label: "Django", value: "django" },
              { label: "Flask", value: "flask" },
              { label: "Spring", value: "spring" }
            ],
            ui: {
              label: "Frameworks & Libraries",
              width: "full",
              order: 2
            }
          }
        ]
      },

      // Design Skills (conditional on UX Designer)
      {
        id: "design_skills_section",
        type: "section",
        name: "design_skills",
        ui: {
          label: "Design Skills",
          order: 4
        },
        conditions: [
          {
            id: "show_design_skills",
            condition: {
              field: "position_applied",
              operator: "equals",
              value: "ux_designer"
            },
            actions: [
              {
                action: "show",
                target: "design_skills_section"
              }
            ]
          }
        ],
        fields: [
          {
            id: "design_tools",
            type: "checkboxgroup",
            name: "design_tools",
            options: [
              { label: "Figma", value: "figma" },
              { label: "Sketch", value: "sketch" },
              { label: "Adobe XD", value: "adobe_xd" },
              { label: "Adobe Photoshop", value: "photoshop" },
              { label: "Adobe Illustrator", value: "illustrator" },
              { label: "InVision", value: "invision" },
              { label: "Principle", value: "principle" }
            ],
            ui: {
              label: "Design Tools",
              width: "full",
              order: 1
            }
          },
          {
            id: "portfolio_url",
            type: "url",
            name: "portfolio_url",
            required: true,
            validation: {
              required: true,
              format: "url"
            },
            ui: {
              label: "Portfolio URL",
              placeholder: "https://yourportfolio.com",
              width: "full",
              order: 2
            }
          }
        ]
      },

      // File Uploads
      {
        id: "documents_section",
        type: "section",
        name: "documents",
        ui: {
          label: "Documents",
          order: 5
        },
        fields: [
          {
            id: "resume",
            type: "file",
            name: "resume",
            required: true,
            accept: ".pdf,.doc,.docx",
            maxFileSize: 5 * 1024 * 1024, // 5MB
            validation: {
              required: true
            },
            ui: {
              label: "Resume/CV",
              helpText: "Upload your resume (PDF, DOC, or DOCX, max 5MB)",
              width: "full",
              order: 1
            }
          },
          {
            id: "cover_letter",
            type: "file",
            name: "cover_letter",
            accept: ".pdf,.doc,.docx",
            maxFileSize: 5 * 1024 * 1024, // 5MB
            ui: {
              label: "Cover Letter (Optional)",
              helpText: "Upload your cover letter (PDF, DOC, or DOCX, max 5MB)",
              width: "full",
              order: 2
            }
          }
        ]
      },

      // Additional Information
      {
        id: "additional_section",
        type: "section",
        name: "additional_info",
        ui: {
          label: "Additional Information",
          order: 6
        },
        fields: [
          {
            id: "why_join",
            type: "textarea",
            name: "why_join",
            required: true,
            validation: {
              required: true,
              minLength: 50,
              maxLength: 500
            },
            ui: {
              label: "Why do you want to join our company?",
              placeholder: "Tell us what motivates you to apply...",
              helpText: "50-500 characters",
              width: "full",
              order: 1
            }
          },
          {
            id: "start_date",
            type: "date",
            name: "start_date",
            required: true,
            validation: {
              required: true,
              custom: [
                {
                  type: "future_date",
                  message: "Start date must be in the future"
                }
              ]
            },
            ui: {
              label: "Available Start Date",
              width: "half",
              order: 2
            }
          },
          {
            id: "remote_work",
            type: "radio",
            name: "remote_work",
            required: true,
            options: [
              { label: "Office only", value: "office" },
              { label: "Hybrid (2-3 days office)", value: "hybrid" },
              { label: "Fully remote", value: "remote" }
            ],
            ui: {
              label: "Preferred Work Arrangement",
              width: "half",
              order: 3
            }
          }
        ]
      }
    ],
    conditional: {
      rules: [
        {
          id: "show_technical_skills",
          condition: {
            field: "position_applied",
            operator: "in",
            value: ["software_engineer", "senior_software_engineer", "data_scientist", "devops_engineer"]
          },
          actions: [
            {
              action: "show",
              target: "technical_skills_section"
            }
          ]
        },
        {
          id: "show_design_skills",
          condition: {
            field: "position_applied",
            operator: "equals",
            value: "ux_designer"
          },
          actions: [
            {
              action: "show",
              target: "design_skills_section"
            }
          ]
        },
        {
          id: "require_portfolio",
          condition: {
            field: "position_applied",
            operator: "equals",
            value: "ux_designer"
          },
          actions: [
            {
              action: "require",
              target: "portfolio_url"
            }
          ]
        }
      ]
    }
  },
  createdAt: "2025-01-22T10:00:00Z",
  updatedAt: "2025-01-22T11:15:00Z",
  createdBy: "550e8400-e29b-41d4-a716-446655440001",
  updatedBy: "550e8400-e29b-41d4-a716-446655440001"
};
```

### 4. E-commerce Order Form with Dynamic Pricing

An e-commerce order form with dynamic calculations and inventory validation:

```typescript
const orderForm: FormDefinition = {
  id: "550e8400-e29b-41d4-a716-446655440004",
  name: "product_order",
  version: "1.5.0",
  status: "published",
  metadata: {
    title: "Product Order Form",
    description: "Complete your purchase",
    category: "ecommerce",
    tags: ["order", "ecommerce", "purchase"],
    version: "1.5.0",
    submitButtonText: "Complete Order",
    successMessage: "Order placed successfully! You will receive a confirmation email shortly."
  },
  schema: {
    fields: [
      // Product Selection
      {
        id: "product_section",
        type: "section",
        name: "product_selection",
        ui: {
          label: "Product Selection",
          order: 1
        },
        fields: [
          {
            id: "products",
            type: "repeater",
            name: "products",
            ui: {
              label: "Products",
              width: "full",
              order: 1
            },
            fields: [
              {
                id: "product_id",
                type: "select",
                name: "product_id",
                required: true,
                options: [
                  { label: "Wireless Headphones - $99.99", value: "headphones", metadata: { price: 99.99, stock: 50 } },
                  { label: "Bluetooth Speaker - $79.99", value: "speaker", metadata: { price: 79.99, stock: 25 } },
                  { label: "Smart Watch - $299.99", value: "smartwatch", metadata: { price: 299.99, stock: 15 } },
                  { label: "Phone Case - $19.99", value: "phonecase", metadata: { price: 19.99, stock: 100 } }
                ],
                ui: {
                  label: "Product",
                  width: "half",
                  order: 1
                }
              },
              {
                id: "quantity",
                type: "number",
                name: "quantity",
                required: true,
                defaultValue: 1,
                validation: {
                  required: true,
                  min: 1,
                  max: 10
                },
                ui: {
                  label: "Quantity",
                  width: "quarter",
                  order: 2
                }
              },
              {
                id: "color",
                type: "select",
                name: "color",
                options: [
                  { label: "Black", value: "black" },
                  { label: "White", value: "white" },
                  { label: "Blue", value: "blue" },
                  { label: "Red", value: "red" }
                ],
                ui: {
                  label: "Color",
                  width: "quarter",
                  order: 3
                }
              }
            ]
          },
          {
            id: "subtotal",
            type: "currency",
            name: "subtotal",
            readonly: true,
            computed: {
              formula: "sum(products, item => item.quantity * getProductPrice(item.product_id))",
              dependencies: ["products"]
            },
            ui: {
              label: "Subtotal",
              width: "half",
              order: 2
            }
          },
          {
            id: "tax",
            type: "currency",
            name: "tax",
            readonly: true,
            computed: {
              formula: "subtotal * 0.08", // 8% tax
              dependencies: ["subtotal"]
            },
            ui: {
              label: "Tax (8%)",
              width: "quarter",
              order: 3
            }
          },
          {
            id: "shipping",
            type: "currency",
            name: "shipping",
            readonly: true,
            computed: {
              formula: "subtotal >= 100 ? 0 : 9.99", // Free shipping over $100
              dependencies: ["subtotal"]
            },
            ui: {
              label: "Shipping",
              width: "quarter",
              order: 4
            }
          },
          {
            id: "total",
            type: "currency",
            name: "total",
            readonly: true,
            computed: {
              formula: "subtotal + tax + shipping",
              dependencies: ["subtotal", "tax", "shipping"]
            },
            ui: {
              label: "Total",
              variant: "primary",
              width: "full",
              order: 5
            }
          }
        ]
      },

      // Shipping Information
      {
        id: "shipping_section",
        type: "section",
        name: "shipping_info",
        ui: {
          label: "Shipping Information",
          order: 2
        },
        fields: [
          {
            id: "shipping_first_name",
            type: "text",
            name: "shipping_first_name",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 50
            },
            ui: {
              label: "First Name",
              width: "half",
              order: 1
            }
          },
          {
            id: "shipping_last_name",
            type: "text",
            name: "shipping_last_name",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 50
            },
            ui: {
              label: "Last Name",
              width: "half",
              order: 2
            }
          },
          {
            id: "shipping_address",
            type: "text",
            name: "shipping_address",
            required: true,
            validation: {
              required: true,
              minLength: 5,
              maxLength: 100
            },
            ui: {
              label: "Street Address",
              width: "full",
              order: 3
            }
          },
          {
            id: "shipping_city",
            type: "text",
            name: "shipping_city",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 50
            },
            ui: {
              label: "City",
              width: "third",
              order: 4
            }
          },
          {
            id: "shipping_state",
            type: "select",
            name: "shipping_state",
            required: true,
            options: [
              { label: "California", value: "CA" },
              { label: "New York", value: "NY" },
              { label: "Texas", value: "TX" },
              { label: "Florida", value: "FL" }
            ],
            ui: {
              label: "State",
              width: "third",
              order: 5
            }
          },
          {
            id: "shipping_zip",
            type: "text",
            name: "shipping_zip",
            required: true,
            validation: {
              required: true,
              pattern: "^\\d{5}(-\\d{4})?$"
            },
            ui: {
              label: "ZIP Code",
              placeholder: "12345",
              width: "third",
              order: 6
            }
          }
        ]
      },

      // Billing Information
      {
        id: "billing_section",
        type: "section",
        name: "billing_info",
        ui: {
          label: "Billing Information",
          order: 3
        },
        fields: [
          {
            id: "same_as_shipping",
            type: "checkbox",
            name: "same_as_shipping",
            defaultValue: true,
            ui: {
              label: "Billing address is the same as shipping address",
              width: "full",
              order: 1
            }
          },
          {
            id: "billing_first_name",
            type: "text",
            name: "billing_first_name",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 50
            },
            ui: {
              label: "First Name",
              width: "half",
              order: 2
            },
            conditions: [
              {
                id: "hide_billing_name",
                condition: {
                  field: "same_as_shipping",
                  operator: "equals",
                  value: true
                },
                actions: [
                  {
                    action: "hide",
                    target: "billing_first_name"
                  }
                ]
              }
            ]
          }
          // Additional billing fields would be here...
        ]
      },

      // Payment Information
      {
        id: "payment_section",
        type: "section",
        name: "payment_info",
        ui: {
          label: "Payment Information",
          order: 4
        },
        fields: [
          {
            id: "payment_method",
            type: "radio",
            name: "payment_method",
            required: true,
            options: [
              { label: "Credit Card", value: "credit_card" },
              { label: "PayPal", value: "paypal" },
              { label: "Apple Pay", value: "apple_pay" }
            ],
            ui: {
              label: "Payment Method",
              width: "full",
              order: 1
            }
          },
          {
            id: "card_number",
            type: "text",
            name: "card_number",
            required: true,
            validation: {
              required: true,
              pattern: "^\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}$",
              custom: [
                {
                  type: "luhn_check",
                  message: "Invalid credit card number"
                }
              ]
            },
            ui: {
              label: "Card Number",
              placeholder: "1234 5678 9012 3456",
              width: "full",
              order: 2
            },
            conditions: [
              {
                id: "show_card_fields",
                condition: {
                  field: "payment_method",
                  operator: "equals",
                  value: "credit_card"
                },
                actions: [
                  {
                    action: "show",
                    target: "card_number"
                  }
                ]
              }
            ]
          }
          // Additional payment fields...
        ]
      }
    ],
    conditional: {
      rules: [
        {
          id: "hide_billing_when_same",
          condition: {
            field: "same_as_shipping",
            operator: "equals",
            value: true
          },
          actions: [
            {
              action: "hide",
              target: "billing_first_name"
            },
            {
              action: "hide",
              target: "billing_last_name"
            },
            {
              action: "hide",
              target: "billing_address"
            },
            {
              action: "hide",
              target: "billing_city"
            },
            {
              action: "hide",
              target: "billing_state"
            },
            {
              action: "hide",
              target: "billing_zip"
            }
          ]
        },
        {
          id: "show_credit_card_fields",
          condition: {
            field: "payment_method",
            operator: "equals",
            value: "credit_card"
          },
          actions: [
            {
              action: "show",
              target: "card_number"
            },
            {
              action: "show",
              target: "expiry_date"
            },
            {
              action: "show",
              target: "cvv"
            },
            {
              action: "show",
              target: "cardholder_name"
            }
          ]
        }
      ]
    }
  },
  createdAt: "2025-01-22T10:00:00Z",
  updatedAt: "2025-01-22T12:00:00Z",
  createdBy: "550e8400-e29b-41d4-a716-446655440001",
  updatedBy: "550e8400-e29b-41d4-a716-446655440001"
};
```

## Form Inheritance Examples

### 5. Template Form and Extensions

Demonstrating form inheritance and composition patterns:

```typescript
// Base contact information template
const contactInfoTemplate: FormDefinition = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  name: "contact_info_template",
  version: "1.0.0",
  status: "published",
  metadata: {
    title: "Contact Information Template",
    description: "Reusable contact information fields",
    category: "template",
    tags: ["template", "contact"],
    version: "1.0.0"
  },
  schema: {
    fields: [
      {
        id: "first_name",
        type: "text",
        name: "first_name",
        required: true,
        validation: {
          required: true,
          minLength: 2,
          maxLength: 50
        },
        ui: {
          label: "First Name",
          placeholder: "Enter your first name",
          width: "half",
          order: 1
        }
      },
      {
        id: "last_name",
        type: "text",
        name: "last_name",
        required: true,
        validation: {
          required: true,
          minLength: 2,
          maxLength: 50
        },
        ui: {
          label: "Last Name",
          placeholder: "Enter your last name",
          width: "half",
          order: 2
        }
      },
      {
        id: "email",
        type: "email",
        name: "email",
        required: true,
        validation: {
          required: true,
          format: "email"
        },
        ui: {
          label: "Email Address",
          placeholder: "your.email@example.com",
          width: "full",
          order: 3
        }
      },
      {
        id: "phone",
        type: "tel",
        name: "phone",
        validation: {
          pattern: "^\\+?[1-9]\\d{1,14}$"
        },
        ui: {
          label: "Phone Number",
          placeholder: "+1 (555) 123-4567",
          width: "full",
          order: 4
        }
      }
    ]
  },
  createdAt: "2025-01-22T10:00:00Z",
  updatedAt: "2025-01-22T10:00:00Z",
  createdBy: "550e8400-e29b-41d4-a716-446655440001",
  updatedBy: "550e8400-e29b-41d4-a716-446655440001"
};

// Event registration form extending contact template
const eventRegistrationForm: FormDefinition = {
  id: "550e8400-e29b-41d4-a716-446655440011",
  name: "event_registration",
  version: "1.0.0",
  status: "published",
  metadata: {
    title: "Event Registration",
    description: "Register for our upcoming event",
    category: "events",
    tags: ["event", "registration"],
    version: "1.0.0"
  },
  inheritance: {
    extends: "contact_info_template",
    overrides: {
      phone: {
        required: true, // Make phone required for events
        validation: {
          required: true,
          pattern: "^\\+?[1-9]\\d{1,14}$"
        }
      }
    },
    additions: [
      {
        id: "event_id",
        type: "select",
        name: "event_id",
        required: true,
        options: [
          { label: "Tech Conference 2025", value: "tech_conf_2025" },
          { label: "Product Launch Event", value: "product_launch" },
          { label: "Networking Mixer", value: "networking_mixer" }
        ],
        ui: {
          label: "Event",
          width: "full",
          order: 5
        }
      },
      {
        id: "ticket_type",
        type: "radio",
        name: "ticket_type",
        required: true,
        options: [
          { label: "General Admission - Free", value: "general" },
          { label: "VIP - $99", value: "vip" },
          { label: "Premium - $199", value: "premium" }
        ],
        ui: {
          label: "Ticket Type",
          width: "full",
          order: 6
        }
      },
      {
        id: "dietary_restrictions",
        type: "checkboxgroup",
        name: "dietary_restrictions",
        options: [
          { label: "Vegetarian", value: "vegetarian" },
          { label: "Vegan", value: "vegan" },
          { label: "Gluten-free", value: "gluten_free" },
          { label: "Nut allergy", value: "nut_allergy" },
          { label: "Other", value: "other" }
        ],
        ui: {
          label: "Dietary Restrictions",
          width: "full",
          order: 7
        }
      },
      {
        id: "other_dietary",
        type: "textarea",
        name: "other_dietary",
        ui: {
          label: "Please specify other dietary restrictions",
          placeholder: "Describe your dietary needs...",
          width: "full",
          order: 8
        },
        conditions: [
          {
            id: "show_other_dietary",
            condition: {
              field: "dietary_restrictions",
              operator: "contains",
              value: "other"
            },
            actions: [
              {
                action: "show",
                target: "other_dietary"
              }
            ]
          }
        ]
      }
    ]
  },
  schema: {
    fields: [], // Will be populated from inheritance
    conditional: {
      rules: [
        {
          id: "show_other_dietary",
          condition: {
            field: "dietary_restrictions",
            operator: "contains",
            value: "other"
          },
          actions: [
            {
              action: "show",
              target: "other_dietary"
            }
          ]
        }
      ]
    }
  },
  createdAt: "2025-01-22T10:30:00Z",
  updatedAt: "2025-01-22T10:30:00Z",
  createdBy: "550e8400-e29b-41d4-a716-446655440001",
  updatedBy: "550e8400-e29b-41d4-a716-446655440001"
};
```

## Complex Validation Examples

### 6. Multi-Step Wizard Form

A complex multi-step form with validation dependencies:

```typescript
const wizardForm: FormDefinition = {
  id: "550e8400-e29b-41d4-a716-446655440020",
  name: "business_setup_wizard",
  version: "1.0.0",
  status: "published",
  metadata: {
    title: "Business Setup Wizard",
    description: "Set up your business profile step by step",
    category: "business",
    tags: ["wizard", "business", "setup"],
    version: "1.0.0",
    showProgressBar: true,
    saveProgress: true
  },
  schema: {
    fields: [
      // Step 1: Business Information
      {
        id: "step1",
        type: "fieldset",
        name: "business_info",
        ui: {
          label: "Step 1: Business Information",
          order: 1
        },
        fields: [
          {
            id: "business_name",
            type: "text",
            name: "business_name",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 100,
              custom: [
                {
                  type: "business_name_available",
                  async: true,
                  message: "This business name is already taken"
                }
              ]
            },
            ui: {
              label: "Business Name",
              placeholder: "Enter your business name",
              width: "full",
              order: 1
            }
          },
          {
            id: "business_type",
            type: "select",
            name: "business_type",
            required: true,
            options: [
              { label: "Sole Proprietorship", value: "sole_prop" },
              { label: "Partnership", value: "partnership" },
              { label: "LLC", value: "llc" },
              { label: "Corporation", value: "corporation" },
              { label: "Non-Profit", value: "nonprofit" }
            ],
            ui: {
              label: "Business Type",
              width: "half",
              order: 2
            }
          },
          {
            id: "industry",
            type: "select",
            name: "industry",
            required: true,
            options: [
              { label: "Technology", value: "technology" },
              { label: "Healthcare", value: "healthcare" },
              { label: "Finance", value: "finance" },
              { label: "Retail", value: "retail" },
              { label: "Manufacturing", value: "manufacturing" },
              { label: "Consulting", value: "consulting" },
              { label: "Other", value: "other" }
            ],
            ui: {
              label: "Industry",
              width: "half",
              order: 3
            }
          },
          {
            id: "other_industry",
            type: "text",
            name: "other_industry",
            validation: {
              minLength: 2,
              maxLength: 50
            },
            ui: {
              label: "Please specify industry",
              placeholder: "Enter your industry",
              width: "full",
              order: 4
            },
            conditions: [
              {
                id: "show_other_industry",
                condition: {
                  field: "industry",
                  operator: "equals",
                  value: "other"
                },
                actions: [
                  {
                    action: "show",
                    target: "other_industry"
                  },
                  {
                    action: "require",
                    target: "other_industry"
                  }
                ]
              }
            ]
          }
        ]
      },

      // Step 2: Location & Contact
      {
        id: "step2",
        type: "fieldset",
        name: "location_contact",
        ui: {
          label: "Step 2: Location & Contact",
          order: 2
        },
        fields: [
          {
            id: "business_address",
            type: "text",
            name: "business_address",
            required: true,
            validation: {
              required: true,
              minLength: 5,
              maxLength: 200
            },
            ui: {
              label: "Business Address",
              placeholder: "123 Main Street",
              width: "full",
              order: 1
            }
          },
          {
            id: "city",
            type: "text",
            name: "city",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 50
            },
            ui: {
              label: "City",
              placeholder: "Enter city",
              width: "third",
              order: 2
            }
          },
          {
            id: "state",
            type: "select",
            name: "state",
            required: true,
            options: [
              { label: "California", value: "CA" },
              { label: "New York", value: "NY" },
              { label: "Texas", value: "TX" },
              { label: "Florida", value: "FL" }
            ],
            ui: {
              label: "State",
              width: "third",
              order: 3
            }
          },
          {
            id: "zip_code",
            type: "text",
            name: "zip_code",
            required: true,
            validation: {
              required: true,
              pattern: "^\\d{5}(-\\d{4})?$"
            },
            ui: {
              label: "ZIP Code",
              placeholder: "12345",
              width: "third",
              order: 4
            }
          },
          {
            id: "business_phone",
            type: "tel",
            name: "business_phone",
            required: true,
            validation: {
              required: true,
              pattern: "^\\+?[1-9]\\d{1,14}$"
            },
            ui: {
              label: "Business Phone",
              placeholder: "+1 (555) 123-4567",
              width: "half",
              order: 5
            }
          },
          {
            id: "business_email",
            type: "email",
            name: "business_email",
            required: true,
            validation: {
              required: true,
              format: "email"
            },
            ui: {
              label: "Business Email",
              placeholder: "info@yourbusiness.com",
              width: "half",
              order: 6
            }
          }
        ]
      },

      // Step 3: Services & Preferences
      {
        id: "step3",
        type: "fieldset",
        name: "services_preferences",
        ui: {
          label: "Step 3: Services & Preferences",
          order: 3
        },
        fields: [
          {
            id: "services_offered",
            type: "checkboxgroup",
            name: "services_offered",
            required: true,
            validation: {
              custom: [
                {
                  type: "min_selection",
                  params: { min: 1 },
                  message: "Please select at least one service"
                }
              ]
            },
            options: [
              { label: "Product Sales", value: "product_sales" },
              { label: "Consulting", value: "consulting" },
              { label: "Software Development", value: "software_dev" },
              { label: "Marketing Services", value: "marketing" },
              { label: "Training & Education", value: "training" },
              { label: "Support Services", value: "support" }
            ],
            ui: {
              label: "Services Offered",
              helpText: "Select all services your business will provide",
              width: "full",
              order: 1
            }
          },
          {
            id: "target_customers",
            type: "radio",
            name: "target_customers",
            required: true,
            options: [
              { label: "Business to Business (B2B)", value: "b2b" },
              { label: "Business to Consumer (B2C)", value: "b2c" },
              { label: "Both B2B and B2C", value: "both" }
            ],
            ui: {
              label: "Target Customers",
              width: "full",
              order: 2
            }
          },
          {
            id: "expected_revenue",
            type: "select",
            name: "expected_revenue",
            required: true,
            options: [
              { label: "Under $50,000", value: "under_50k" },
              { label: "$50,000 - $100,000", value: "50k_100k" },
              { label: "$100,000 - $500,000", value: "100k_500k" },
              { label: "$500,000 - $1,000,000", value: "500k_1m" },
              { label: "Over $1,000,000", value: "over_1m" }
            ],
            ui: {
              label: "Expected Annual Revenue",
              width: "full",
              order: 3
            }
          }
        ]
      }
    ],
    validation: {
      rules: [
        {
          type: "step_validation",
          message: "Please complete all required fields in this step before proceeding"
        },
        {
          type: "business_rules",
          message: "Business configuration validation failed"
        }
      ]
    }
  },
  createdAt: "2025-01-22T10:00:00Z",
  updatedAt: "2025-01-22T10:00:00Z",
  createdBy: "550e8400-e29b-41d4-a716-446655440001",
  updatedBy: "550e8400-e29b-41d4-a716-446655440001"
};
```

## Form Submission Examples

### 7. Sample Form Submissions

Examples of how form data is submitted and stored:

```typescript
// Contact form submission
const contactSubmission: FormSubmission = {
  id: "550e8400-e29b-41d4-a716-446655440100",
  formDefinitionId: "550e8400-e29b-41d4-a716-446655440000",
  formVersion: "1.0.0",
  status: "submitted",
  data: {
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    subject: "general",
    message: "I'm interested in learning more about your services.",
    newsletter_signup: true
  },
  isValid: true,
  metadata: {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ipAddress: "192.168.1.100",
    referrer: "https://example.com/contact",
    sessionId: "sess_123456789",
    timeZone: "America/New_York",
    locale: "en-US",
    source: "web",
    processingTime: 145,
    validationTime: 23
  },
  submittedAt: "2025-01-22T14:30:00Z",
  createdAt: "2025-01-22T14:25:00Z",
  updatedAt: "2025-01-22T14:30:00Z",
  submittedBy: "550e8400-e29b-41d4-a716-446655440050",
  lastModifiedBy: "550e8400-e29b-41d4-a716-446655440050"
};

// Job application submission with files
const jobApplicationSubmission: FormSubmission = {
  id: "550e8400-e29b-41d4-a716-446655440101",
  formDefinitionId: "550e8400-e29b-41d4-a716-446655440003",
  formVersion: "2.1.0",
  status: "submitted",
  data: {
    first_name: "Jane",
    last_name: "Smith",
    email: "jane.smith@example.com",
    phone: "+1-555-123-4567",
    linkedin_url: "https://linkedin.com/in/janesmith",
    position_applied: "software_engineer",
    years_experience: "4-5",
    salary_expectation: 85000,
    programming_languages: ["javascript", "typescript", "python"],
    frameworks: ["react", "nodejs", "express"],
    why_join: "I'm passionate about building scalable web applications and would love to contribute to your team's innovative projects.",
    start_date: "2025-03-01",
    remote_work: "hybrid"
  },
  files: {
    resume: {
      name: "jane_smith_resume.pdf",
      size: 1024567,
      type: "application/pdf",
      url: "https://storage.example.com/files/resume_jane_smith.pdf",
      metadata: {
        uploadedAt: "2025-01-22T14:25:00Z",
        virusScanned: true,
        thumbnailUrl: "https://storage.example.com/thumbnails/resume_jane_smith.jpg"
      }
    },
    cover_letter: {
      name: "jane_smith_cover_letter.pdf",
      size: 512345,
      type: "application/pdf",
      url: "https://storage.example.com/files/cover_letter_jane_smith.pdf",
      metadata: {
        uploadedAt: "2025-01-22T14:26:00Z",
        virusScanned: true,
        thumbnailUrl: "https://storage.example.com/thumbnails/cover_letter_jane_smith.jpg"
      }
    }
  },
  isValid: true,
  workflowState: {
    stage: "initial_review",
    assignedTo: "hr_manager_001",
    reviewNotes: "Strong candidate, schedule interview"
  },
  priority: "high",
  submittedAt: "2025-01-22T14:30:00Z",
  createdAt: "2025-01-22T14:20:00Z",
  updatedAt: "2025-01-22T14:30:00Z",
  submittedBy: "550e8400-e29b-41d4-a716-446655440051",
  lastModifiedBy: "550e8400-e29b-41d4-a716-446655440051",
  metadata: {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    ipAddress: "10.0.1.50",
    referrer: "https://careers.example.com/jobs/software-engineer",
    sessionId: "sess_987654321",
    timeZone: "America/Los_Angeles",
    locale: "en-US",
    source: "web",
    processingTime: 2150,
    validationTime: 456,
    fileUploads: [
      {
        fieldId: "resume",
        fileName: "jane_smith_resume.pdf",
        fileSize: 1024567,
        contentType: "application/pdf",
        storageUrl: "https://storage.example.com/files/resume_jane_smith.pdf"
      },
      {
        fieldId: "cover_letter",
        fileName: "jane_smith_cover_letter.pdf",
        fileSize: 512345,
        contentType: "application/pdf",
        storageUrl: "https://storage.example.com/files/cover_letter_jane_smith.pdf"
      }
    ]
  }
};
```

## Query Examples

### 8. Form and Submission Queries

Examples of searching and filtering forms and submissions:

```typescript
// Query for forms by category and tags
const formQuery: FormQuery = {
  page: 1,
  limit: 20,
  sort: [
    { field: "updatedAt", direction: "desc" },
    { field: "title", direction: "asc" }
  ],
  filters: [
    {
      field: "status",
      operator: "in",
      value: ["published", "draft"]
    },
    {
      field: "metadata.category",
      operator: "equals",
      value: "hr"
    }
  ],
  search: "job application",
  tags: ["recruitment", "hiring"],
  dateRange: {
    start: "2025-01-01T00:00:00Z",
    end: "2025-12-31T23:59:59Z"
  }
};

// Query for submissions with data filters
const submissionQuery: SubmissionQuery = {
  page: 1,
  limit: 50,
  sort: [
    { field: "submittedAt", direction: "desc" }
  ],
  filters: [
    {
      field: "status",
      operator: "equals",
      value: "submitted"
    }
  ],
  formId: "550e8400-e29b-41d4-a716-446655440003",
  status: ["submitted", "processing"],
  dateRange: {
    field: "submittedAt",
    start: "2025-01-01T00:00:00Z",
    end: "2025-01-31T23:59:59Z"
  },
  dataFilters: [
    {
      field: "position_applied",
      operator: "equals",
      value: "software_engineer"
    },
    {
      field: "years_experience",
      operator: "in",
      value: ["4-5", "6-10", "10+"]
    },
    {
      field: "programming_languages",
      operator: "contains",
      value: "javascript"
    }
  ]
};

// Advanced submission analytics query
const analyticsQuery: SubmissionQuery = {
  formId: "550e8400-e29b-41d4-a716-446655440000",
  dateRange: {
    field: "submittedAt",
    start: "2025-01-01T00:00:00Z",
    end: "2025-01-31T23:59:59Z"
  },
  include: ["form_definition", "user_profile"],
  fields: [
    "id",
    "submittedAt",
    "data.subject",
    "data.newsletter_signup",
    "metadata.source",
    "metadata.referrer"
  ]
};
```

## Integration Examples

### 9. Event System Integration

Examples of form events and how they integrate with the platform:

```typescript
// Form definition created event
const formCreatedEvent: FormEvent = {
  id: "550e8400-e29b-41d4-a716-446655440200",
  type: "form.definition.created",
  timestamp: "2025-01-22T10:00:00Z",
  source: "form-engine",
  formId: "550e8400-e29b-41d4-a716-446655440000",
  userId: "550e8400-e29b-41d4-a716-446655440001",
  data: {
    formName: "contact_form",
    formVersion: "1.0.0",
    formTitle: "Contact Us",
    category: "communication",
    fieldCount: 6
  },
  metadata: {
    ip: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  },
  correlationId: "req_123456789"
};

// Form submission submitted event
const submissionSubmittedEvent: FormEvent = {
  id: "550e8400-e29b-41d4-a716-446655440201",
  type: "form.submission.submitted",
  timestamp: "2025-01-22T14:30:00Z",
  source: "form-engine",
  formId: "550e8400-e29b-41d4-a716-446655440000",
  submissionId: "550e8400-e29b-41d4-a716-446655440100",
  userId: "550e8400-e29b-41d4-a716-446655440050",
  data: {
    formName: "contact_form",
    formVersion: "1.0.0",
    submissionData: {
      subject: "general",
      hasFiles: false,
      fieldCount: 6
    },
    processingTime: 145,
    validationTime: 23
  },
  metadata: {
    ip: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    source: "web",
    referrer: "https://example.com/contact"
  },
  correlationId: "req_987654321"
};
```

### 10. Plugin System Integration

Examples of form engine plugin integration:

```typescript
// Custom field type plugin
const customFieldPlugin = {
  type: "rating_scale",
  validate: (value: number, rules: FieldValidation) => {
    if (rules.required && (value === null || value === undefined)) {
      return {
        valid: false,
        errors: [{
          field: "rating_scale",
          code: "REQUIRED",
          message: "Rating is required",
          value
        }]
      };
    }

    if (rules.min && value < rules.min) {
      return {
        valid: false,
        errors: [{
          field: "rating_scale",
          code: "MIN_VALUE",
          message: `Rating must be at least ${rules.min}`,
          value
        }]
      };
    }

    return { valid: true, errors: [] };
  },

  render: (field: FieldDefinition, value: number) => {
    return {
      component: "RatingScale",
      props: {
        min: field.validation?.min || 1,
        max: field.validation?.max || 5,
        value: value,
        label: field.ui?.label,
        helpText: field.ui?.helpText,
        size: field.ui?.size || "md"
      }
    };
  },

  serialize: (value: number) => value,
  deserialize: (value: any) => typeof value === 'number' ? value : null
};

// Custom validation plugin
const businessRulesPlugin = {
  name: "business_email_domain",
  validate: async (value: string, context: ValidationContext) => {
    if (!value) return { valid: true, errors: [] };

    const domain = value.split('@')[1];
    const allowedDomains = await fetchAllowedBusinessDomains();

    if (!allowedDomains.includes(domain)) {
      return {
        valid: false,
        errors: [{
          field: context.fieldId,
          code: "INVALID_BUSINESS_DOMAIN",
          message: "Please use a business email address",
          value
        }]
      };
    }

    return { valid: true, errors: [] };
  },
  dependencies: ["network"]
};
```

## Performance Optimization Examples

### 11. Large Form Optimization

Examples of optimizing forms with many fields:

```typescript
// Large survey form with performance optimizations
const largeSurveyForm: FormDefinition = {
  id: "550e8400-e29b-41d4-a716-446655440030",
  name: "comprehensive_survey",
  version: "1.0.0",
  status: "published",
  metadata: {
    title: "Comprehensive User Survey",
    description: "Tell us about your experience",
    category: "survey",
    tags: ["survey", "feedback", "large"],
    version: "1.0.0",
    saveProgress: true, // Enable auto-save for large forms
    showProgressBar: true
  },
  schema: {
    fields: [
      // Use tabs for better organization
      {
        id: "demographics_tab",
        type: "tabs",
        name: "demographics",
        ui: {
          label: "Demographics",
          order: 1
        },
        fields: [
          // Grouped fields to reduce initial render
          {
            id: "basic_info_group",
            type: "fieldset",
            name: "basic_info",
            ui: {
              label: "Basic Information",
              order: 1
            },
            fields: [
              // Standard demographic fields...
            ]
          }
        ]
      },

      // Use accordion for conditional sections
      {
        id: "experience_accordion",
        type: "accordion",
        name: "experience",
        ui: {
          label: "Experience",
          order: 2
        },
        fields: [
          // Experience-related fields...
        ]
      }
    ],

    // Optimize validation
    validation: {
      debounceMs: 500, // Reduce validation frequency
      async: false // Use sync validation where possible
    },

    // Optimize conditional logic
    conditional: {
      evaluationMode: "lazy" // Only evaluate when needed
    }
  },
  createdAt: "2025-01-22T10:00:00Z",
  updatedAt: "2025-01-22T10:00:00Z",
  createdBy: "550e8400-e29b-41d4-a716-446655440001",
  updatedBy: "550e8400-e29b-41d4-a716-446655440001"
};
```

## Real-World Use Cases

### 12. Complete Healthcare Patient Form

A comprehensive healthcare form demonstrating advanced features:

```typescript
const patientIntakeForm: FormDefinition = {
  id: "550e8400-e29b-41d4-a716-446655440040",
  name: "patient_intake",
  version: "3.2.1",
  status: "published",
  metadata: {
    title: "Patient Intake Form",
    description: "New patient registration and medical history",
    category: "healthcare",
    tags: ["patient", "medical", "intake", "hipaa"],
    version: "3.2.1",
    requireAuthentication: true,
    encryptSensitiveData: true,
    retentionPeriod: 2555, // 7 years for medical records
    allowMultipleSubmissions: false
  },
  schema: {
    fields: [
      // Patient Demographics
      {
        id: "patient_demographics",
        type: "section",
        name: "demographics",
        ui: {
          label: "Patient Demographics",
          order: 1
        },
        fields: [
          {
            id: "patient_id",
            type: "text",
            name: "patient_id",
            readonly: true,
            computed: {
              formula: "generatePatientId()",
              dependencies: []
            },
            ui: {
              label: "Patient ID",
              width: "quarter",
              order: 1
            }
          },
          {
            id: "first_name",
            type: "text",
            name: "first_name",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 50,
              pattern: "^[a-zA-Z\\s\\-']+$"
            },
            ui: {
              label: "First Name",
              width: "quarter",
              order: 2
            },
            metadata: {
              pii: true,
              encryption: "required"
            }
          },
          {
            id: "middle_name",
            type: "text",
            name: "middle_name",
            validation: {
              maxLength: 50,
              pattern: "^[a-zA-Z\\s\\-']*$"
            },
            ui: {
              label: "Middle Name",
              width: "quarter",
              order: 3
            }
          },
          {
            id: "last_name",
            type: "text",
            name: "last_name",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 50,
              pattern: "^[a-zA-Z\\s\\-']+$"
            },
            ui: {
              label: "Last Name",
              width: "quarter",
              order: 4
            },
            metadata: {
              pii: true,
              encryption: "required"
            }
          },
          {
            id: "date_of_birth",
            type: "date",
            name: "date_of_birth",
            required: true,
            validation: {
              required: true,
              custom: [
                {
                  type: "valid_birth_date",
                  message: "Please enter a valid birth date"
                }
              ]
            },
            ui: {
              label: "Date of Birth",
              width: "third",
              order: 5
            },
            metadata: {
              pii: true,
              encryption: "required"
            }
          },
          {
            id: "gender",
            type: "select",
            name: "gender",
            required: true,
            options: [
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
              { label: "Non-binary", value: "non_binary" },
              { label: "Prefer not to say", value: "prefer_not_to_say" },
              { label: "Other", value: "other" }
            ],
            ui: {
              label: "Gender",
              width: "third",
              order: 6
            }
          },
          {
            id: "marital_status",
            type: "select",
            name: "marital_status",
            options: [
              { label: "Single", value: "single" },
              { label: "Married", value: "married" },
              { label: "Divorced", value: "divorced" },
              { label: "Widowed", value: "widowed" },
              { label: "Separated", value: "separated" }
            ],
            ui: {
              label: "Marital Status",
              width: "third",
              order: 7
            }
          }
        ]
      },

      // Medical History with complex conditional logic
      {
        id: "medical_history",
        type: "section",
        name: "medical_history",
        ui: {
          label: "Medical History",
          order: 2
        },
        fields: [
          {
            id: "current_medications",
            type: "repeater",
            name: "current_medications",
            ui: {
              label: "Current Medications",
              helpText: "List all medications you are currently taking",
              width: "full",
              order: 1
            },
            fields: [
              {
                id: "medication_name",
                type: "text",
                name: "medication_name",
                required: true,
                validation: {
                  required: true,
                  minLength: 2,
                  maxLength: 100
                },
                ui: {
                  label: "Medication Name",
                  width: "half",
                  order: 1
                }
              },
              {
                id: "dosage",
                type: "text",
                name: "dosage",
                required: true,
                validation: {
                  required: true,
                  maxLength: 50
                },
                ui: {
                  label: "Dosage",
                  placeholder: "e.g., 10mg",
                  width: "quarter",
                  order: 2
                }
              },
              {
                id: "frequency",
                type: "select",
                name: "frequency",
                required: true,
                options: [
                  { label: "Once daily", value: "once_daily" },
                  { label: "Twice daily", value: "twice_daily" },
                  { label: "Three times daily", value: "three_times_daily" },
                  { label: "Four times daily", value: "four_times_daily" },
                  { label: "As needed", value: "as_needed" },
                  { label: "Other", value: "other" }
                ],
                ui: {
                  label: "Frequency",
                  width: "quarter",
                  order: 3
                }
              }
            ]
          },

          {
            id: "allergies",
            type: "textarea",
            name: "allergies",
            validation: {
              maxLength: 500
            },
            ui: {
              label: "Known Allergies",
              placeholder: "List any known allergies to medications, foods, or other substances",
              helpText: "Include severity and reactions if known",
              width: "full",
              order: 2
            }
          },

          {
            id: "chronic_conditions",
            type: "checkboxgroup",
            name: "chronic_conditions",
            options: [
              { label: "Diabetes", value: "diabetes" },
              { label: "Hypertension", value: "hypertension" },
              { label: "Heart Disease", value: "heart_disease" },
              { label: "Asthma", value: "asthma" },
              { label: "Depression", value: "depression" },
              { label: "Anxiety", value: "anxiety" },
              { label: "Arthritis", value: "arthritis" },
              { label: "Cancer", value: "cancer" },
              { label: "Other", value: "other" }
            ],
            ui: {
              label: "Chronic Conditions",
              helpText: "Select all that apply",
              width: "full",
              order: 3
            }
          },

          {
            id: "other_chronic_condition",
            type: "textarea",
            name: "other_chronic_condition",
            validation: {
              maxLength: 200
            },
            ui: {
              label: "Please specify other chronic conditions",
              placeholder: "Describe any other chronic conditions",
              width: "full",
              order: 4
            },
            conditions: [
              {
                id: "show_other_chronic",
                condition: {
                  field: "chronic_conditions",
                  operator: "contains",
                  value: "other"
                },
                actions: [
                  {
                    action: "show",
                    target: "other_chronic_condition"
                  }
                ]
              }
            ]
          }
        ]
      },

      // Emergency Contact
      {
        id: "emergency_contact",
        type: "section",
        name: "emergency_contact",
        ui: {
          label: "Emergency Contact",
          order: 3
        },
        fields: [
          {
            id: "emergency_contact_name",
            type: "text",
            name: "emergency_contact_name",
            required: true,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 100
            },
            ui: {
              label: "Full Name",
              width: "half",
              order: 1
            }
          },
          {
            id: "emergency_contact_relationship",
            type: "select",
            name: "emergency_contact_relationship",
            required: true,
            options: [
              { label: "Spouse", value: "spouse" },
              { label: "Parent", value: "parent" },
              { label: "Child", value: "child" },
              { label: "Sibling", value: "sibling" },
              { label: "Friend", value: "friend" },
              { label: "Other", value: "other" }
            ],
            ui: {
              label: "Relationship",
              width: "half",
              order: 2
            }
          },
          {
            id: "emergency_contact_phone",
            type: "tel",
            name: "emergency_contact_phone",
            required: true,
            validation: {
              required: true,
              pattern: "^\\+?[1-9]\\d{1,14}$"
            },
            ui: {
              label: "Phone Number",
              width: "half",
              order: 3
            }
          },
          {
            id: "emergency_contact_email",
            type: "email",
            name: "emergency_contact_email",
            validation: {
              format: "email"
            },
            ui: {
              label: "Email Address",
              width: "half",
              order: 4
            }
          }
        ]
      },

      // Consent and Acknowledgments
      {
        id: "consent_section",
        type: "section",
        name: "consent",
        ui: {
          label: "Consent and Acknowledgments",
          order: 4
        },
        fields: [
          {
            id: "privacy_consent",
            type: "checkbox",
            name: "privacy_consent",
            required: true,
            validation: {
              required: true,
              custom: [
                {
                  type: "must_be_true",
                  message: "You must acknowledge the privacy policy to proceed"
                }
              ]
            },
            ui: {
              label: "I acknowledge that I have read and understand the Privacy Policy and consent to the collection and use of my health information as described.",
              width: "full",
              order: 1
            }
          },
          {
            id: "treatment_consent",
            type: "checkbox",
            name: "treatment_consent",
            required: true,
            validation: {
              required: true,
              custom: [
                {
                  type: "must_be_true",
                  message: "Treatment consent is required"
                }
              ]
            },
            ui: {
              label: "I consent to receive medical treatment and understand that no guarantee has been made regarding the outcome of treatment.",
              width: "full",
              order: 2
            }
          },
          {
            id: "signature",
            type: "signature",
            name: "patient_signature",
            required: true,
            validation: {
              required: true
            },
            ui: {
              label: "Patient Signature",
              helpText: "Please sign using your mouse, finger, or stylus",
              width: "full",
              order: 3
            }
          },
          {
            id: "signature_date",
            type: "date",
            name: "signature_date",
            required: true,
            defaultValue: "today",
            readonly: true,
            ui: {
              label: "Date Signed",
              width: "half",
              order: 4
            }
          }
        ]
      }
    ],

    validation: {
      rules: [
        {
          type: "hipaa_compliance",
          message: "Form must comply with HIPAA requirements"
        },
        {
          type: "required_signatures",
          message: "All required signatures must be completed"
        }
      ]
    }
  },
  createdAt: "2025-01-22T10:00:00Z",
  updatedAt: "2025-01-22T15:30:00Z",
  createdBy: "550e8400-e29b-41d4-a716-446655440001",
  updatedBy: "550e8400-e29b-41d4-a716-446655440001"
};
```

These examples demonstrate the full range of capabilities of the Form Engine, from simple contact forms to complex multi-step workflows with conditional logic, file uploads, computed fields, and advanced validation. Each example includes realistic data structures and showcases different aspects of the form system's flexibility and power.

## Relationships
- **Parent Nodes:** [components/form-engine/specification.md]
- **Child Nodes:** None
- **Related Nodes:**
  - [components/form-engine/schema.ts] - TypeScript interfaces used in examples
  - [components/form-engine/api.md] - API endpoints for form operations

## Navigation Guidance
- **Access Context:** Use this document for understanding practical Form Engine usage patterns
- **Common Next Steps:** Review schema.ts for data structures, api.md for integration details
- **Related Tasks:** Form implementation, testing, user training
- **Update Patterns:** Add new examples when implementing new features or patterns

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/DOC-002-1 Implementation
- **Task:** DOC-002-1

## Change History
- 2025-01-22: Initial creation of Form Engine examples and use cases (DOC-002-1)