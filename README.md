# SonyCentral Project Documentation

## Project Overview

SonyCentral is a comprehensive e-commerce data management system that integrates Shopify store data with a centralized database. The project consists of two main components:

1. **Next.js Frontend Application** (`sonycentral/`) - Modern web interface for data visualization and management
2. **Python Backend Services** (`localchat/`) - AI-powered database assistant and API services

## Project Structure

```
sonycentral1/
├── sonycentral/                    # Next.js Frontend Application
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   ├── components/            # React Components
│   │   ├── lib/                   # Utility Libraries
│   │   └── hooks/                 # Custom React Hooks
│   └── package.json               # Node.js Dependencies
├── localchat/                     # Python Backend Services
│   ├── localchat/                # Core Python Modules
│   └── requirements.txt          # Python Dependencies
├── db_assistant_api.py           # FastAPI Database Assistant
└── README.md                     # This file
```

## Key Features

### 🛒 Shopify Integration
- **Multi-Store Support**: Manage multiple Shopify stores from a single interface
- **Data Synchronization**: Automated sync of orders, products, customers, and transactions
- **Real-time Updates**: Live data fetching from Shopify APIs

### 🤖 AI-Powered Database Assistant
- **Natural Language Queries**: Ask questions in plain English
- **SQL Generation**: Automatic SQL query generation from natural language
- **Data Export**: Export results to Excel/CSV formats
- **Schema Understanding**: Dynamic database schema analysis

### 📊 Data Management
- **Order Processing**: Complete order lifecycle management
- **Product Variants**: SKU mapping and variant tracking
- **Customer Analytics**: Customer behavior and purchase history
- **Transaction Tracking**: Payment and refund processing

## Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **UI Library**: React with TypeScript
- **Styling**: Tailwind CSS
- **Database**: MySQL with connection pooling
- **State Management**: Zustand

### Backend (Python)
- **API Framework**: FastAPI
- **AI/ML**: LangChain with Ollama
- **Database**: MySQL with SQLAlchemy
- **Data Processing**: Pandas, NumPy

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- MySQL Database
- Ollama (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sonycentral1
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd sonycentral
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd localchat
   pip install -r requirements.txt
   ```

4. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Configure database credentials
   - Set up Shopify API keys

### Running the Application

1. **Start the Next.js Frontend**
```bash
cd sonycentral
npm run dev
```

2. **Start the Python Backend**
```bash
   cd localchat
   python db_assistant_api.py
   ```

## API Endpoints

### Frontend APIs (`/api/`)
- `GET/POST /api/sync` - Synchronize Shopify data
- `GET /api/stores` - List all stores
- `GET /api/customers` - Customer data
- `GET /api/orders` - Order data
- `GET /api/products` - Product data

### Backend APIs (`/`)
- `GET/POST /ask` - Natural language database queries
- `GET/POST /ask_explain` - Detailed query explanations
- `GET /downloads/{filename}` - Export file downloads

## Database Schema

The system uses a comprehensive MySQL schema with the following main tables:

- **stores** - Shopify store configurations
- **orders** - Order information
- **order_items** - Line items for each order
- **order_transaction** - Payment transactions
- **products** - Product catalog
- **product_variants** - Product variations
- **customers** - Customer information
- **sku_mapping** - SKU to product mapping

## File Relationships

### Core Integration Files
- `sonycentral/src/app/api/sync/route.ts` ↔ `sonycentral/src/lib/shopify/`
- `sonycentral/src/lib/db.ts` ↔ All API routes
- `db_assistant_api.py` ↔ `localchat/localchat/`

### Data Flow
1. **Frontend** → **API Routes** → **Database**
2. **Shopify APIs** → **Sync Routes** → **Database**
3. **User Queries** → **AI Assistant** → **Database** → **Results**

## Development

### Adding New Features
1. Create API routes in `sonycentral/src/app/api/`
2. Add database queries in `sonycentral/src/lib/`
3. Update frontend components in `sonycentral/src/components/`

### Database Changes
1. Update schema in database
2. Modify sync routes to handle new fields
3. Update TypeScript interfaces

## Deployment

### Production Setup
1. Configure environment variables
2. Set up MySQL database
3. Deploy Next.js application
4. Deploy Python backend
5. Configure reverse proxy (nginx)

### Monitoring
- Database connection health
- API response times
- Error logging
- Data sync status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the documentation in each module's README
- Review the API documentation
- Check the database schema documentation
- Contact the development team