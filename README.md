# MechLink

**MechLink** is a full-stack, web-based service platform that connects vehicle owners with nearby mechanics for **emergency breakdown assistance** and **planned vehicle servicing**, combining workflow management, geolocation, and decision-support analytics into a single user-friendly system.

---

## **Features**

### 1. Emergency Breakdown Workflow
- Users can raise a **Breakdown Token** with real-time geolocation consent.
- Nearby mechanics see open tokens with **distance, ETA, and priority**.
- Mechanics can **Accept, Reject, or Resolve** tokens.
- Users receive **email notifications** and UI confirmations.

### 2. Planned Servicing & Booking
- Users search for nearby mechanics sorted by **distance + match score**.
- System checks **slot availability** before booking.
- Bookings appear in both **User and Mechanic dashboards**.
- Cancellation handling with **refund notifications**.

### 3. Transparency & Decision-Support
- **Match Score:** Combines mechanic rating and distance to rank results fairly.
- **Integrity Score:** Evaluates trust based on ratings, pricing fairness, and return-visit history.
- **Fair Pricing Classification:** Highlights overcharging or inconsistent pricing.
- **Vehicle Health Score:** Tracks service recency and overdue maintenance.
- **Spend Analytics:** Total spend, monthly average, and most expensive services.
- **Maintenance & Legal Reminders:** MOT, insurance, and road tax alerts.
- **Symptom Advisor:** Rule-based engine to advise on emergency vs planned issues.

---

## **Technologies Used**

- **Frontend:** React, Tailwind CSS, component-based UI
- **Backend:** Node.js, Express.js, RESTful API design
- **Database:** MongoDB (with GeoJSON + geospatial indexing)
- **Authentication:** JWT, role-based access control (RBAC)
- **Notifications:** Nodemailer (emails for token acceptance and booking cancellations)

---

## **Architecture**

Three-tier architecture:

- **Frontend:** React  
  - Handles UI, forms, dashboards, and user interactions
- **Backend:** Node.js / Express API  
  - Processes requests, business logic, notifications, and security
- **Database:** MongoDB (Geospatial + Analytics)  
  - Stores users, mechanics, bookings, tokens, service records

---

## **Screenshot**

#### 1.UserTypeSelectionPage<img width="1908" height="920" alt="Screenshot 2026-02-04 183553" src="https://github.com/user-attachments/assets/ffecfa5a-6332-47c5-b6f2-e550d9db4c5b" />
#### 2.LoginPage<img width="1887" height="900" alt="Screenshot 2025-12-17 155352" src="https://github.com/user-attachments/assets/ef347743-5464-43b8-b862-2513e44b61b9" /><img width="1907" height="913" alt="Screenshot 2026-02-05 132856" src="https://github.com/user-attachments/assets/31b16936-6e0b-42e7-81fe-c360fe506987" />
#### 3.UserHomePage<img width="1877" height="902" alt="Screenshot 2025-12-17 155506" src="https://github.com/user-attachments/assets/b88a8ced-3937-42c7-b611-ccf092de9980" />
#### 4.MechanicHomePage<img width="1883" height="912" alt="Screenshot 2026-02-05 133546" src="https://github.com/user-attachments/assets/c995b51a-8d06-47f1-aba6-aae9ead4db8f" />









## **Getting Started**

1. Clone the repository:

```bash
git clone https://github.com/FawazNazmo/MechLink.git
cd MechLink
