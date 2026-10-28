require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const WorkOrder = require('../models/WorkOrder');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const Part = require('../models/Part');
const Mechanic = require('../models/Mechanic');
const Transaction = require('../models/Transaction');

const makeCustomerHistory = (vehicle, service, amount) => [
  { date: "14 Apr 2025", vehicle, service, amount },
  { date: "12 Mar 2025", vehicle: "Patrol", service: "Brake service", amount: 420 },
  { date: "15 Jan 2025", vehicle: "Land Cruiser", service: "AC service", amount: 280 },
];

const featuredCustomers = [
  { customerId: "CUST-001", name: "Sheikh Ahmed", initials: "SA", phone: "66871557", email: "sheikh.ahmed@qatar.net", address: "Doha, Qatar", type: "Individual", vehicleCount: 3, lastVisit: "14 Apr 2025", totalSpent: 4280, status: "VIP", vehicles: [{ model: "Toyota Land Cruiser", year: "2020", plate: "770781", lastService: "14 Apr 2025" }, { model: "Nissan Patrol", year: "2019", plate: "660421", lastService: "12 Mar 2025" }, { model: "Lexus RX 350", year: "2021", plate: "662114", lastService: "5 Jan 2025" }], history: makeCustomerHistory("Land Cruiser", "Engine oil change", 350), notes: "Prefers genuine parts and regular maintenance. Always requests quick turnaround time." },
  { customerId: "CUST-002", name: "Muhammad Muddasir", initials: "MM", phone: "55420123", email: "m.muddasir@example.com", address: "Doha, Qatar", type: "Individual", vehicleCount: 2, lastVisit: "12 Apr 2025", totalSpent: 1850, status: "Active", vehicles: [{ model: "Nissan Patrol", year: "2019", plate: "660421", lastService: "12 Apr 2025" }, { model: "Lexus RX 350", year: "2020", plate: "602114", lastService: "6 Apr 2025" }], history: makeCustomerHistory("Patrol", "Brake service", 420), notes: "Regular customer. Prefers appointments in the morning." },
  { customerId: "CUST-003", name: "Ali Shah", initials: "AS", phone: "30124567", email: "ali.shah@example.com", address: "Al Rayyan, Qatar", type: "Fleet", vehicleCount: 5, lastVisit: "10 Apr 2025", totalSpent: 6420, status: "Active", vehicles: [{ model: "Lexus ES", year: "2021", plate: "562315", lastService: "10 Apr 2025" }, { model: "Toyota Camry", year: "2020", plate: "445566", lastService: "20 Mar 2025" }, { model: "Honda Accord", year: "2019", plate: "123899", lastService: "12 Feb 2025" }], history: makeCustomerHistory("Lexus ES", "Full service", 680), notes: "Fleet account. Contact the customer before starting additional work." },
  { customerId: "CUST-004", name: "Khalid Al Marri", initials: "KM", phone: "33118765", email: "khalid.marri@example.com", address: "Doha, Qatar", type: "Corporate", vehicleCount: 4, lastVisit: "11 Apr 2025", totalSpent: 3150, status: "Active", vehicles: [{ model: "Renault Duster", year: "2018", plate: "366730", lastService: "11 Apr 2025" }, { model: "Nissan Sunny", year: "2020", plate: "220033", lastService: "5 Mar 2025" }], history: makeCustomerHistory("Duster", "AC service", 820), notes: "Corporate account. Invoices should be sent to the fleet administrator." },
  { customerId: "CUST-005", name: "Ahmed Raza", initials: "AR", phone: "66233411", email: "ahmed.raza@example.com", address: "Doha, Qatar", type: "Individual", vehicleCount: 1, lastVisit: "8 Apr 2025", totalSpent: 980, status: "Active", vehicles: [{ model: "BMW X6", year: "2019", plate: "981877", lastService: "8 Apr 2025" }], history: makeCustomerHistory("BMW X6", "Brake pads", 720), notes: "Customer prefers text updates when repairs are complete." },
  { customerId: "CUST-006", name: "Fahad Khan", initials: "FN", phone: "55667788", email: "fahad.khan@example.com", address: "Al Wakrah, Qatar", type: "Individual", vehicleCount: 2, lastVisit: "6 Apr 2025", totalSpent: 2340, status: "Active", vehicles: [{ model: "Lexus RX 350", year: "2020", plate: "602114", lastService: "6 Apr 2025" }, { model: "Toyota Yaris", year: "2021", plate: "778932", lastService: "3 Jan 2025" }], history: makeCustomerHistory("Lexus RX 350", "Tire alignment", 480), notes: "Contact before ordering vehicle-specific parts." },
  { customerId: "CUST-007", name: "Bilal Khan", initials: "BN", phone: "50998877", email: "bilal.khan@example.com", address: "Doha, Qatar", type: "Individual", vehicleCount: 1, lastVisit: "3 Apr 2025", totalSpent: 1250, status: "Inactive", vehicles: [{ model: "Toyota Corolla", year: "2021", plate: "554211", lastService: "3 Apr 2025" }], history: makeCustomerHistory("Corolla", "General service", 420), notes: "No recent customer activity." },
  { customerId: "CUST-008", name: "Zara Noor", initials: "ZN", phone: "66778855", email: "zara.noor@example.com", address: "Lusail, Qatar", type: "Individual", vehicleCount: 2, lastVisit: "2 Apr 2025", totalSpent: 1980, status: "Active", vehicles: [{ model: "Toyota Yaris", year: "2021", plate: "778932", lastService: "2 Apr 2025" }, { model: "Honda Civic", year: "2020", plate: "205667", lastService: "15 Feb 2025" }], history: makeCustomerHistory("Toyota Yaris", "Electrical repair", 280), notes: "Customer prefers a call before vehicle pickup." },
  { customerId: "CUST-009", name: "Sara Mohammed", initials: "SM", phone: "33221144", email: "sara.mohammed@example.com", address: "Doha, Qatar", type: "Individual", vehicleCount: 1, lastVisit: "1 Apr 2025", totalSpent: 870, status: "Active", vehicles: [{ model: "Honda Civic", year: "2020", plate: "205667", lastService: "1 Apr 2025" }], history: makeCustomerHistory("Honda Civic", "General service", 600), notes: "Regular maintenance customer." },
  { customerId: "CUST-010", name: "Omar Saeed", initials: "OS", phone: "55887766", email: "omar.saeed@example.com", address: "Al Rayyan, Qatar", type: "Fleet", vehicleCount: 3, lastVisit: "29 Mar 2025", totalSpent: 3560, status: "Corporate", vehicles: [{ model: "Mitsubishi Pajero", year: "2018", plate: "998877", lastService: "29 Mar 2025" }, { model: "Toyota Hilux", year: "2019", plate: "889911", lastService: "8 Mar 2025" }], history: makeCustomerHistory("Pajero", "Engine diagnostic", 950), notes: "Fleet account. Send service summaries to the main office." },
];

const createVehicleHistory = (job, amount) => [
  { date: "14 Apr 2025", job, mileage: "125,430", amount },
  { date: "10 Jan 2025", job: "Brake service", mileage: "118,200", amount: 480 },
  { date: "15 Sep 2024", job: "AC service", mileage: "112,800", amount: 420 },
];

const initialVehicles = [
  { vehicleId: "VEH-0052", plate: "770781", customer: "Sheikh Ahmed", phone: "66871557", model: "Toyota Land Cruiser", year: "2020", mileage: "125,430", lastService: "14 Apr 2025", nextService: "14 Jul 2025", status: "In Service", advisor: "Ali Hassan", fuel: "Diesel", color: "White", notes: "Customer reports engine noise and AC not cooling properly.", history: createVehicleHistory("Engine oil change", 350) },
  { vehicleId: "VEH-0051", plate: "660421", customer: "Mohammed Al Sadi", phone: "55112233", model: "Nissan Patrol", year: "2019", mileage: "98,200", lastService: "12 Apr 2025", nextService: "12 Jul 2025", status: "Ready", advisor: "M. Khan", fuel: "Petrol", color: "Red", notes: "Brake service completed. Customer notified that the vehicle is ready for pickup.", history: createVehicleHistory("Brake service", 650) },
  { vehicleId: "VEH-0050", plate: "562315", customer: "Ali Shah", phone: "55345678", model: "Lexus ES", year: "2021", mileage: "67,850", lastService: "10 Apr 2025", nextService: "10 Jul 2025", status: "Due", advisor: "Ali Hassan", fuel: "Petrol", color: "Black", notes: "Regular service due. Customer requested a vehicle inspection.", history: createVehicleHistory("Oil change", 400) },
  { vehicleId: "VEH-0049", plate: "366730", customer: "Khalid Al Marri", phone: "55167890", model: "Renault Duster", year: "2018", mileage: "82,400", lastService: "11 Apr 2025", nextService: "11 Jul 2025", status: "Ready", advisor: "M. Khan", fuel: "Petrol", color: "White", notes: "AC service complete. Please confirm pickup time with the customer.", history: createVehicleHistory("AC service", 820) },
  { vehicleId: "VEH-0048", plate: "981877", customer: "Ahmed Raza", phone: "55223344", model: "BMW X6", year: "2019", mileage: "71,250", lastService: "8 Apr 2025", nextService: "8 Jul 2025", status: "In Service", advisor: "Ali Hassan", fuel: "Petrol", color: "Red", notes: "Front brake pads being replaced.", history: createVehicleHistory("Brake pads", 720) },
  { vehicleId: "VEH-0047", plate: "602114", customer: "Fahad Khan", phone: "55556677", model: "Lexus RX 350", year: "2020", mileage: "89,600", lastService: "6 Apr 2025", nextService: "6 Jul 2025", status: "Due", advisor: "M. Khan", fuel: "Petrol", color: "White", notes: "Vehicle is due for scheduled maintenance.", history: createVehicleHistory("Tire alignment", 480) },
  { vehicleId: "VEH-0046", plate: "554211", customer: "Bilal Khan", phone: "55112233", model: "Toyota Corolla", year: "2021", mileage: "54,320", lastService: "3 Apr 2025", nextService: "3 Jul 2025", status: "Ready", advisor: "Ali Hassan", fuel: "Petrol", color: "White", notes: "AC service and inspection completed.", history: createVehicleHistory("AC service", 510) },
  { vehicleId: "VEH-0045", plate: "778932", customer: "Zara Noor", phone: "55778899", model: "Toyota Yaris", year: "2021", mileage: "48,750", lastService: "2 Apr 2025", nextService: "2 Jul 2025", status: "Archived", advisor: "M. Khan", fuel: "Petrol", color: "Blue", notes: "Vehicle record archived at customer request.", history: createVehicleHistory("Electrical repair", 280) },
  { vehicleId: "VEH-0044", plate: "205667", customer: "Sara Mohammed", phone: "55445566", model: "Honda Civic", year: "2020", mileage: "76,890", lastService: "1 Apr 2025", nextService: "1 Jul 2025", status: "Ready", advisor: "Ali Hassan", fuel: "Petrol", color: "White", notes: "General service completed.", history: createVehicleHistory("General service", 600) },
  { vehicleId: "VEH-0043", plate: "998877", customer: "Omar Saeed", phone: "55889900", model: "Mitsubishi Pajero", year: "2018", mileage: "102,340", lastService: "29 Mar 2025", nextService: "29 Jun 2025", status: "Due", advisor: "M. Khan", fuel: "Petrol", color: "Black", notes: "Engine diagnostic required. Awaiting customer confirmation.", history: createVehicleHistory("Engine diagnostic", 950) },
];

const makePartActivity = (ref) => [
  { date: "12 Apr 2025", type: "Restocked", quantity: 20, reference: "GRN-0082", notes: "Purchase order" },
  { date: "10 Apr 2025", type: "Sold", quantity: 2, reference: "WO-0047", notes: "Customer vehicle" },
  { date: "8 Apr 2025", type: "Sold", quantity: 4, reference: "WO-0042", notes: "Customer vehicle" },
];

const sampleParts = [
  { partId: "PRT-1001", name: "Engine Oil 5W-30", category: "Engine Oil", brand: "Mobil", quantity: 45, lowStockAt: 8, unitCost: 35, sellingPrice: 35, commission: 0, lastUpdated: "14 Apr 2025", supplier: "Al-Futtaim Auto Parts", lastRestocked: "12 Apr 2025", activity: makePartActivity("GRN-0082") },
  { partId: "PRT-1002", name: "Brake Pads Front", category: "Brakes", brand: "Toyota", quantity: 12, lowStockAt: 15, unitCost: 280, sellingPrice: 280, commission: 40, lastUpdated: "12 Apr 2025", supplier: "Al-Futtaim Auto Parts", lastRestocked: "12 Apr 2025", activity: makePartActivity("GRN-0082") },
  { partId: "PRT-1003", name: "Oil Filter", category: "Filters", brand: "Mann", quantity: 38, lowStockAt: 8, unitCost: 45, sellingPrice: 45, commission: 0, lastUpdated: "10 Apr 2025", supplier: "Mann Qatar", lastRestocked: "10 Apr 2025", activity: makePartActivity("GRN-0081") },
  { partId: "PRT-1004", name: "Spark Plug (Set)", category: "Ignition", brand: "NGK", quantity: 22, lowStockAt: 6, unitCost: 120, sellingPrice: 120, commission: 15, lastUpdated: "8 Apr 2025", supplier: "Auto Parts Trading", lastRestocked: "8 Apr 2025", activity: makePartActivity("GRN-0080") },
  { partId: "PRT-1005", name: "Air Filter", category: "Filters", brand: "Toyota", quantity: 8, lowStockAt: 10, unitCost: 85, sellingPrice: 85, commission: 10, lastUpdated: "8 Apr 2025", supplier: "Al-Futtaim Auto Parts", lastRestocked: "8 Apr 2025", activity: makePartActivity("GRN-0079") },
  { partId: "PRT-1006", name: "Car Battery 60Ah", category: "Electrical", brand: "Varta", quantity: 6, lowStockAt: 8, unitCost: 420, sellingPrice: 420, commission: 50, lastUpdated: "6 Apr 2025", supplier: "Gulf Batteries", lastRestocked: "6 Apr 2025", activity: makePartActivity("GRN-0078") },
  { partId: "PRT-1007", name: "Wiper Blades", category: "Body", brand: "Bosch", quantity: 25, lowStockAt: 8, unitCost: 65, sellingPrice: 65, commission: 5, lastUpdated: "5 Apr 2025", supplier: "Bosch Qatar", lastRestocked: "5 Apr 2025", activity: makePartActivity("GRN-0077") },
  { partId: "PRT-1008", name: "Brake Disc Front", category: "Brakes", brand: "Brembo", quantity: 4, lowStockAt: 6, unitCost: 320, sellingPrice: 320, commission: 30, lastUpdated: "3 Apr 2025", supplier: "Brembo Trading", lastRestocked: "3 Apr 2025", activity: makePartActivity("GRN-0076") },
  { partId: "PRT-1009", name: "Timing Belt", category: "Engine", brand: "Gates", quantity: 0, lowStockAt: 5, unitCost: 250, sellingPrice: 250, commission: 25, lastUpdated: "2 Apr 2025", supplier: "Gates Qatar", lastRestocked: "2 Apr 2025", activity: makePartActivity("GRN-0075") },
  { partId: "PRT-1010", name: "Coolant 5L", category: "Fluids", brand: "Castrol", quantity: 15, lowStockAt: 8, unitCost: 60, sellingPrice: 60, commission: 0, lastUpdated: "1 Apr 2025", supplier: "Castrol Qatar", lastRestocked: "1 Apr 2025", activity: makePartActivity("GRN-0074") },
];

const mechanicAssignments = (name, service) => [
  { workOrder: "WO-00012", vehicle: "Toyota Corolla", customer: "Sheikh Ahmed", service, status: "In Progress" },
  { workOrder: "WO-00006", vehicle: "Honda Civic", customer: "Muhammad Muddasir", service: "Brake Service", status: "In Progress" },
];

const featuredMechanics = [
  { mechanicId: "MEC-1001", name: "Ali Hassan", initials: "AH", role: "Engine Specialist", phone: "050 123 4567", email: "ali.hassan@garageworkspace.com", status: "On Job", shift: "Morning", assignedJobs: 3, completedJobs: 248, rating: 4.8, experience: 6, notes: "Expert in engine diagnostics and premium detailing.", assignments: mechanicAssignments("Ali Hassan", "Engine Diagnostics") },
  { mechanicId: "MEC-1002", name: "M. Khan", initials: "MK", role: "Brake Specialist", phone: "050 234 5678", email: "m.khan@garageworkspace.com", status: "Available", shift: "Morning", assignedJobs: 2, completedJobs: 194, rating: 4.5, experience: 5, notes: "Experienced brake and suspension technician.", assignments: mechanicAssignments("M. Khan", "Brake Service") },
  { mechanicId: "MEC-1003", name: "Ahmed Raza", initials: "AR", role: "Electrical", phone: "050 345 6789", email: "ahmed.raza@garageworkspace.com", status: "On Job", shift: "Evening", assignedJobs: 3, completedJobs: 171, rating: 4.7, experience: 4, notes: "Specializes in diagnostics, wiring, and electrical systems.", assignments: mechanicAssignments("Ahmed Raza", "Electrical Diagnostics") },
  { mechanicId: "MEC-1004", name: "Bilal Khan", initials: "BK", role: "AC Specialist", phone: "050 456 7890", email: "bilal.khan@garageworkspace.com", status: "Available", shift: "Morning", assignedJobs: 1, completedJobs: 156, rating: 4.3, experience: 4, notes: "Air-conditioning service and climate system repairs.", assignments: mechanicAssignments("Bilal Khan", "AC Service") },
];

const initialWorkOrders = [
  { workOrderId: "WO-00012", year: "2018", vehicle: "BMW X6", plate: "770781", customer: "Sheikh Ahmed", service: "Full polish", detail: "Exterior detail", mechanic: "Ali Hassan", initials: "AH", status: "In Progress", total: 930 },
  { workOrderId: "WO-00006", year: "2018", vehicle: "Renault Duster", plate: "360730", customer: "Muhammad Muddasir", service: "Brake service", detail: "Front & rear", mechanic: "M. Khan", initials: "MK", status: "Awaiting Parts", total: 820 },
  { workOrderId: "WO-00003", year: "2019", vehicle: "Lexus GS", plate: "1234", customer: "Muhammad Muddasir", service: "Oil change", detail: "Filter replacement", mechanic: "Ali Shah", initials: "AS", status: "In Progress", total: 400 },
  { workOrderId: "WO-00002", year: "2020", vehicle: "Lexus RX 350", plate: "Q 1", customer: "Muhammad Muddasir", service: "Tire alignment", detail: "Wheel balancing", mechanic: "M. Khan", initials: "MK", status: "Ready for Delivery", total: 480 },
];

const initialQuotations = [
  { quotationId: "QT-00018", customer: "Sheikh Ahmed", phone: "66871557", vehicle: "Toyota Land Cruiser", year: "2020", plate: "770781", service: "Brake pads replacement", amount: 850, date: "14/04/2025", validUntil: "21/04/2025", status: "Awaiting Approval", advisor: "Ali Hassan", time: "2 hours ago", items: [{ name: "Brake Pads Front", quantity: 1, unitPrice: 450, total: 450, type: "Part" }, { name: "Brake Labour", quantity: 1, unitPrice: 400, total: 400, type: "Labour" }] },
  { quotationId: "QT-00017", customer: "Mohammed Al Sadi", phone: "55112233", vehicle: "Nissan Patrol", year: "2019", plate: "660421", service: "AC service and gas refill", amount: 650, date: "14/04/2025", validUntil: "21/04/2025", status: "Awaiting Approval", advisor: "M. Khan", time: "5 hours ago", items: [{ name: "AC Gas R134a", quantity: 1, unitPrice: 350, total: 350, type: "Part" }, { name: "AC Labour", quantity: 1, unitPrice: 300, total: 300, type: "Labour" }] },
  { quotationId: "QT-00016", customer: "Ali Shah", phone: "30124567", vehicle: "Lexus ES", year: "2021", plate: "562315", service: "Full body polish", amount: 400, date: "13/04/2025", validUntil: "20/04/2025", status: "Awaiting Approval", advisor: "Ali Hassan", time: "1 day ago", items: [{ name: "Body Polish Compound", quantity: 1, unitPrice: 150, total: 150, type: "Part" }, { name: "Detailing Labour", quantity: 1, unitPrice: 250, total: 250, type: "Labour" }] },
];

const initialInvoices = [
  { invoiceId: "INV-00152", customer: "Sheikh Ahmed", phone: "770781", email: "sheikh.ahmed@example.com", vehicle: "Toyota Land Cruiser", year: "2020", plate: "770781", workOrder: "WO-00012", service: "Full polish", detail: "Exterior detail and body polish", status: "Pending", date: "14 Apr 2025", dueDate: "21 Apr 2025", amount: 930, discount: 46.5, advisor: "Ali Hassan", items: [{ name: "Full Body Polish", quantity: 1, unitPrice: 350 }, { name: "Wax & Protect", quantity: 1, unitPrice: 200 }, { name: "Interior Vacuum", quantity: 1, unitPrice: 150 }, { name: "Tire Dressing", quantity: 1, unitPrice: 230 }] },
  { invoiceId: "INV-00151", customer: "Muhammad Muddasir", phone: "360730", email: "m.muddasir@example.com", vehicle: "Nissan Patrol", year: "2019", plate: "660401", workOrder: "WO-00015", service: "Brake service", detail: "Brake pads replacement", status: "Paid", date: "13 Apr 2025", dueDate: "20 Apr 2025", amount: 650, discount: 0, advisor: "M. Khan", items: [{ name: "Brake Pads", quantity: 1, unitPrice: 450 }, { name: "Brake Labour", quantity: 1, unitPrice: 200 }] },
  { invoiceId: "INV-00150", customer: "Ali Shah", phone: "55345678", email: "ali.shah@example.com", vehicle: "Lexus ES", year: "2021", plate: "1234", workOrder: "WO-00003", service: "Oil change", detail: "Oil and filter replacement", status: "Pending", date: "12 Apr 2025", dueDate: "19 Apr 2025", amount: 400, discount: 0, advisor: "Ali Hassan", items: [{ name: "Engine Oil 5W-30", quantity: 1, unitPrice: 280 }, { name: "Oil Filter", quantity: 1, unitPrice: 70 }, { name: "Labour", quantity: 1, unitPrice: 50 }] },
  { invoiceId: "INV-00149", customer: "Khalid Al Marri", phone: "55167890", email: "khalid.marri@example.com", vehicle: "Renault Duster", year: "2018", plate: "360730", workOrder: "WO-00006", service: "AC service", detail: "AC service and gas refill", status: "Paid", date: "11 Apr 2025", dueDate: "18 Apr 2025", amount: 820, discount: 0, advisor: "M. Khan", items: [{ name: "AC Gas Refill", quantity: 1, unitPrice: 450 }, { name: "AC Filter", quantity: 1, unitPrice: 170 }, { name: "Labour", quantity: 1, unitPrice: 200 }] },
  { invoiceId: "INV-00148", customer: "Ahmed Raza", phone: "55223344", email: "ahmed.raza@example.com", vehicle: "BMW X6", year: "2019", plate: "556677", workOrder: "WO-00013", service: "Brake pads", detail: "Front brake pads replacement", status: "Overdue", date: "10 Apr 2025", dueDate: "17 Apr 2025", amount: 720, discount: 0, advisor: "Ali Hassan", items: [{ name: "Brake Pads (Front)", quantity: 1, unitPrice: 520 }, { name: "Brake Labour", quantity: 1, unitPrice: 200 }] },
  { invoiceId: "INV-00147", customer: "Fahad Khan", phone: "55556677", email: "fahad.khan@example.com", vehicle: "Lexus RX 350", year: "2020", plate: "Q 1", workOrder: "WO-00002", service: "Tire alignment", detail: "Alignment and wheel balancing", status: "Paid", date: "9 Apr 2025", dueDate: "16 Apr 2025", amount: 480, discount: 0, advisor: "M. Khan", items: [{ name: "Wheel Alignment", quantity: 1, unitPrice: 280 }, { name: "Wheel Balancing", quantity: 4, unitPrice: 50 }] },
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas for seeding...');

    // Clear existing collections
    await Promise.all([
      Customer.deleteMany({}),
      Vehicle.deleteMany({}),
      WorkOrder.deleteMany({}),
      Quotation.deleteMany({}),
      Invoice.deleteMany({}),
      Part.deleteMany({}),
      Mechanic.deleteMany({}),
    ]);
    console.log('Cleared existing collections.');

    // Insert initial data
    await Customer.insertMany(featuredCustomers);
    console.log(`Inserted ${featuredCustomers.length} featured customers.`);

    await Vehicle.insertMany(initialVehicles);
    console.log(`Inserted ${initialVehicles.length} vehicles.`);

    await Part.insertMany(sampleParts);
    console.log(`Inserted ${sampleParts.length} parts.`);

    await Mechanic.insertMany(featuredMechanics);
    console.log(`Inserted ${featuredMechanics.length} mechanics.`);

    await WorkOrder.insertMany(initialWorkOrders);
    console.log(`Inserted ${initialWorkOrders.length} work orders.`);

    await Quotation.insertMany(initialQuotations);
    console.log(`Inserted ${initialQuotations.length} quotations.`);

    await Invoice.insertMany(initialInvoices);
    console.log(`Inserted ${initialInvoices.length} invoices.`);

    console.log('All initial data seeded successfully into MongoDB Atlas!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
