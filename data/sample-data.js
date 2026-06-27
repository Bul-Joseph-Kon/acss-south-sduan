// Sample Data for ACSS System

const sampleData = {
    declarations: [
        { id: 'DEC-001', date: '2024-01-15', goods: 'Electronics - Laptops', hsCode: '8471.30', quantity: 50, unit: 'PCS', value: 25000, status: 'pending', tin: 'TIN123', risk: 'Low', port: 'Nimule' },
        { id: 'DEC-002', date: '2024-01-14', goods: 'Cotton Textiles', hsCode: '5208.11', quantity: 1000, unit: 'MTR', value: 15000, status: 'approved', tin: 'TIN123', risk: 'Low', port: 'Juba Airport' },
        { id: 'DEC-003', date: '2024-01-13', goods: 'Toyota Land Cruiser', hsCode: '8703.23', quantity: 3, unit: 'PCS', value: 75000, status: 'review', tin: 'TIN456', risk: 'High', port: 'Nimule' },
        { id: 'DEC-004', date: '2024-01-12', goods: 'Pharmaceuticals', hsCode: '3004.90', quantity: 500, unit: 'CTN', value: 45000, status: 'review', tin: 'TIN789', risk: 'Medium', port: 'Juba Airport' },
        { id: 'DEC-005', date: '2024-01-11', goods: 'Construction Cement', hsCode: '2523.29', quantity: 5000, unit: 'BAG', value: 35000, status: 'pending', tin: 'TIN123', risk: 'Low', port: 'Renk' }
    ],
    
    users: [
        { id: 1, name: 'John Deng', email: 'john@example.com', tin: 'TIN123', role: 'importer' },
        { id: 2, name: 'Sarah Abuk', email: 'sarah@example.com', tin: 'TIN456', role: 'agent' },
        { id: 3, name: 'Michael Lual', email: 'michael@customs.gov', tin: 'OFF001', role: 'officer' }
    ],
    
    payments: [
        { id: 'PAY-001', declarationId: 'DEC-001', amount: 2500, status: 'paid', date: '2024-01-16', method: 'Bank Transfer' },
        { id: 'PAY-002', declarationId: 'DEC-002', amount: 1500, status: 'pending', date: '2024-01-15', method: 'Cash' }
    ],
    
    hsCodes: [
        { code: '8471.30', description: 'Laptops and portable computers', duty: 10 },
        { code: '5208.11', description: 'Cotton woven fabrics', duty: 15 },
        { code: '8703.23', description: 'Motor vehicles', duty: 25 },
        { code: '3004.90', description: 'Medicaments', duty: 5 },
        { code: '2523.29', description: 'Portland cement', duty: 20 }
    ],
    
    ports: [
        'Nimule', 'Juba International Airport', 'Renk', 'Kaya', 'Wau Airport'
    ],
    
    countries: [
        'China', 'Uganda', 'Kenya', 'UAE', 'India', 'Turkey', 'UK', 'USA'
    ]
};

// Global declarations array
let declarations = [...sampleData.declarations];
let payments = [...sampleData.payments];