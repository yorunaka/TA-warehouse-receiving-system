graph TD
    %% Actors
    Admin([Admin])
    User([User / Operator])

    %% System Core / Processes
    subgraph Warehouse System
        P1[1.0 Product & Doc Management]
        P2[2.0 Validate & Record Receipt]
        P3[3.0 Stock & Audit Logger]
        P4[4.0 View Inventory & History]
    end

    %% Data Stores
    DB_Prod[(Products Table)]
    DB_Doc[(Receiving Docs & Items)]
    DB_Inv[(Inventory Table)]
    DB_Tx[(Transaction Logs)]

    %% Flow Connections
    Admin -->|Create Product SKU| P1
    Admin -->|Create Receiving Doc| P1
    P1 -->|Write Master Data| DB_Prod
    P1 -->|Write Doc DRAFT| DB_Doc

    User -->|Submit Received Qty| P2
    P2 -->|Read Line Item Qty| DB_Doc
    P2 -->|Validate Over-receipt| DB_Doc
    P2 -->|Trigger Stock Update| P3

    P3 -->|Increment Stock| DB_Inv
    P3 -->|Write Audit Entry| DB_Tx

    User -->|Query Inventory & Logs| P4
    Admin -->|Query Inventory & Logs| P4
    DB_Inv -->|Return Stock Levels| P4
    DB_Tx -->|Return Audit History| P4