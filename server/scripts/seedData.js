const mongoose = require('mongoose');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const Admin = require('../models/Admin');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-fee-management');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await Student.deleteMany({});
    // await Fee.deleteMany({});

    // Create sample students
    const students = [
      {
        rollNumber: 'STU001',
        name: 'John Doe',
        email: 'john.doe@example.com',
        class: '10',
        section: 'A',
        phone: '9876543210'
      },
      {
        rollNumber: 'STU002',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        class: '10',
        section: 'B',
        phone: '9876543211'
      },
      {
        rollNumber: 'STU003',
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        class: '11',
        section: 'A',
        phone: '9876543212'
      }
    ];

    const createdStudents = await Student.insertMany(students);
    console.log('Students created:', createdStudents.length);

    // Create sample fees for students
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    const fees = createdStudents.map((student, index) => {
      const components = [
        { name: 'Tuition Fee', amount: 50000 },
        { name: 'Library Fee', amount: 2000 },
        { name: 'Sports Fee', amount: 3000 },
        { name: 'Lab Fee', amount: 5000 }
      ];

      const totalAmount = components.reduce((sum, comp) => sum + comp.amount, 0);
      
      // First student has partial payment, second has no payment, third has full payment
      let paidAmount = 0;
      if (index === 0) paidAmount = 20000; // Partial
      if (index === 2) paidAmount = totalAmount; // Full

      return {
        studentId: student._id,
        academicYear: academicYear,
        components: components,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        dueAmount: totalAmount - paidAmount,
        status: paidAmount === 0 ? 'pending' : paidAmount === totalAmount ? 'paid' : 'partial'
      };
    });

    const createdFees = await Fee.insertMany(fees);
    console.log('Fees created:', createdFees.length);

    // Create default admin account
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const admin = new Admin({
        username: 'admin',
        password: 'admin123', // Change this in production!
        name: 'Administrator',
        email: 'admin@school.com',
        role: 'admin'
      });
      await admin.save();
      console.log('Default admin created:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
      console.log('  ⚠️  Please change the password after first login!');
    } else {
      console.log('Admin account already exists');
    }

    console.log('\n✅ Sample data seeded successfully!');
    console.log('\nSample Roll Numbers for testing:');
    console.log('STU001 - Partial payment (₹20,000 paid, ₹40,000 due)');
    console.log('STU002 - No payment (₹60,000 due)');
    console.log('STU003 - Fully paid (₹60,000 paid)');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

