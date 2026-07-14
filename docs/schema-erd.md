# Schema ERD

```mermaid
erDiagram
    clients {
        string _id PK
        string name
        string phone_number
        string created_at
        string updated_at
    }

    inquiries {
        string _id PK
        string client_id FK
        string status
        string title
        string created_at
        string updated_at
    }

    packages {
        string _id PK
        string name
        string duration
        string season
        string transport
        string status
        string year
        string package_code
        string inclusions
        string exclusions
        string created_at
        string updated_at
    }

    package_flights {
        string _id PK
        string package_id FK
        string month
        string flight
        string departure_date
        string departure_sector
        string return_date
        string return_sector
        string created_at
    }

    package_hotels {
        string _id PK
        string package_id FK
        string hotel_type
        string name
        boolean enabled
        string placeholder
        string created_at
    }

    package_meals {
        string _id PK
        string package_hotel_id FK
        string meal_type
        string created_at
    }

    package_rooms {
        string _id PK
        string package_id FK
        string room_type
        number price
        boolean enabled
        string created_at
    }

    hotel_templates {
        string _id PK
        string hotel_type
        string name
        string placeholder
        boolean enabled
        string created_at
    }

    room_templates {
        string _id PK
        string name
        number price
        boolean enabled
        number sort_order
        string created_at
    }

    profiles {
        string _id PK
        string full_name
        string branch
        string unit
        string updated_at
    }

    quotations {
        string _id PK
        string client_id FK
        string package_id FK
        string flight_id FK
        string inquiry_id FK
        string hijri_year
        number sequence_num
        number revision
        string client_name
        string status
        number total_amount
        string notes
        string pic_name
        string branch
        string created_by
        string created_at
        string updated_at
        object package_snapshot
        object flight_snapshot
        array hotels_snapshot
    }

    quotation_items {
        string _id PK
        string quotation_id FK
        string item_type
        string description
        string package_room_id FK
        number quantity
        number unit_price
        number original_price
        string created_at
    }

    quotation_logs {
        string _id PK
        string quotation_id FK
        string action
        string description
        string performed_by
        string created_at
        string snapshot_data
    }

    %% Client relationships
    clients ||--o{ inquiries : "has"
    clients ||--o{ quotations : "has"

    %% Inquiry relationships
    inquiries ||--o{ quotations : "tracks"

    %% Package hierarchy
    packages ||--o{ package_flights : "has"
    packages ||--o{ package_hotels : "has"
    packages ||--o{ package_rooms : "has"
    package_hotels ||--o{ package_meals : "has"

    %% Templates seed new packages (no hard FK, logical reference only)
    hotel_templates ||--o{ package_hotels : "seeds"
    room_templates ||--o{ package_rooms : "seeds"

    %% Quotation relationships
    packages ||--o{ quotations : "referenced by"
    package_flights ||--o{ quotations : "selected in"
    quotations ||--o{ quotation_items : "has"
    quotations ||--o{ quotation_logs : "audited by"
    package_rooms ||--o{ quotation_items : "referenced by"
```

## Relationship Notes

| Relationship | Type | Note |
|---|---|---|
| `clients` → `inquiries` | one-to-many | A client can have multiple inquiries |
| `clients` → `quotations` | one-to-many | A client can have multiple quotations |
| `inquiries` → `quotations` | one-to-many | An inquiry can produce multiple quotations |
| `packages` → `package_flights` | one-to-many | A package has multiple flight schedules |
| `packages` → `package_hotels` | one-to-many | A package has multiple hotel configurations |
| `packages` → `package_rooms` | one-to-many | A package has multiple room types |
| `package_hotels` → `package_meals` | one-to-many | A hotel config has multiple meal options |
| `hotel_templates` → `package_hotels` | seed only | Templates seed new packages, no hard FK |
| `room_templates` → `package_rooms` | seed only | Templates seed new packages, no hard FK |
| `packages` → `quotations` | one-to-many | Denormalized via `package_id` string + `package_snapshot` |
| `package_flights` → `quotations` | one-to-many | Denormalized via `flight_id` string + `flight_snapshot` |
| `quotations` → `quotation_items` | one-to-many | Line items (rooms, add-ons, discounts) |
| `quotations` → `quotation_logs` | one-to-many | Full audit trail |
| `package_rooms` → `quotation_items` | one-to-many | Soft ref via `package_room_id` string |
