require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const Worker = require('./models/Worker');
const Complaint = require('./models/Complaint');
const Notification = require('./models/Notification');

const departmentsData = [
  { name: 'Water Supply', head: 'Robert Vance', contactEmail: 'water@civicconnect.gov' },
  { name: 'Electricity', head: 'Sarah Jenkins', contactEmail: 'power@civicconnect.gov' },
  { name: 'Road Department', head: 'John Mercer', contactEmail: 'roads@civicconnect.gov' },
  { name: 'Traffic Management', head: 'Elena Rostova', contactEmail: 'traffic@civicconnect.gov' },
  { name: 'Garbage Collection', head: 'Gary Rubbish', contactEmail: 'sanitation@civicconnect.gov' },
  { name: 'Drainage', head: 'David Sewer', contactEmail: 'drainage@civicconnect.gov' },
  { name: 'Street Lights', head: 'Thomas Edison', contactEmail: 'lights@civicconnect.gov' },
  { name: 'Municipality', head: 'Mayor Higgins', contactEmail: 'municipality@civicconnect.gov' }
];

const seed = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicconnect');
    console.log('Database connected!');

    // Clear old data
    console.log('Clearing existing collections...');
    await User.deleteMany({});
    await Department.deleteMany({});
    await Worker.deleteMany({});
    await Complaint.deleteMany({});
    await Notification.deleteMany({});

    console.log('Creating users...');
    // Clear passwords will be hashed by pre-save schema hooks
    const adminUser = await User.create({
      name: 'Admin Chief',
      email: 'admin@civicconnect.com',
      password: 'adminpassword',
      role: 'Admin',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120'
    });

    const citizen1 = await User.create({
      name: 'Alexandra Chen',
      email: 'alex.chen@example.com',
      password: 'citizenpassword',
      role: 'Citizen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'
    });

    const citizen2 = await User.create({
      name: 'Marcus Brody',
      email: 'marcus@example.com',
      password: 'citizenpassword',
      role: 'Citizen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
    });

    console.log('Creating departments...');
    const departments = [];
    for (const dept of departmentsData) {
      const created = await Department.create(dept);
      departments.push(created);
    }

    console.log('Creating workers...');
    const workersList = [
      { name: 'John Doe', deptName: 'Road Department', status: 'Available', contact: '+1 (555) 101-2020' },
      { name: 'Will Smith', deptName: 'Road Department', status: 'Busy', contact: '+1 (555) 101-2021' },
      { name: 'Alice Johnson', deptName: 'Water Supply', status: 'Available', contact: '+1 (555) 202-3030' },
      { name: 'Bob Myers', deptName: 'Water Supply', status: 'Offline', contact: '+1 (555) 202-3031' },
      { name: 'Charlie Green', deptName: 'Electricity', status: 'Available', contact: '+1 (555) 303-4040' },
      { name: 'Diana Ross', deptName: 'Electricity', status: 'Busy', contact: '+1 (555) 303-4041' },
      { name: 'Edward Norton', deptName: 'Garbage Collection', status: 'Available', contact: '+1 (555) 404-5050' },
      { name: 'Frank Grillo', deptName: 'Traffic Management', status: 'Available', contact: '+1 (555) 505-6060' }
    ];

    const workers = [];
    for (const w of workersList) {
      const dept = departments.find(d => d.name === w.deptName);
      if (dept) {
        const createdWorker = await Worker.create({
          name: w.name,
          department: dept._id,
          status: w.status,
          contact: w.contact
        });
        workers.push(createdWorker);
      }
    }

    console.log('Creating complaints...');
    const complaintsDataList = [
      {
        title: 'Massive Pothole on Main Street',
        department: 'Road Department',
        description: 'A deep pothole has opened up near the major intersection of Main and 4th block. Several cars have suffered tyre damage already. It needs immediate patch-work before heavy rains.',
        priority: 'High',
        status: 'In Progress',
        address: 'Main St & 4th Ave Intersection, Central City',
        images: ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600'],
        citizen: citizen1._id,
        workerName: 'Will Smith',
        deptName: 'Road Department'
      },
      {
        title: 'Street Light Blown out on Neon Street',
        department: 'Street Lights',
        description: 'The street light pole #34 beside the community park has been blinking for a week and has now completely died. The street is pitch black at night, making it unsafe for walkers.',
        priority: 'Medium',
        status: 'Resolved',
        address: '102 Neon Street, Near Central Park',
        images: ['https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&q=80&w=600'],
        citizen: citizen1._id,
        deptName: 'Street Lights'
      },
      {
        title: 'Garbage Dump Overflowing and Pest Influx',
        department: 'Garbage Collection',
        description: 'The community dumpster hasn\'t been cleared for four days. Stray dogs and rodents are tearing bags apart. Foul smell is diffusing into houses nearby.',
        priority: 'Low',
        status: 'Pending',
        address: '422 Lilac Gardens Lane, West End',
        images: ['https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=600'],
        citizen: citizen1._id,
        deptName: 'Garbage Collection'
      },
      {
        title: 'Burst Water Pipeline Flooding Street',
        department: 'Water Supply',
        description: 'A major underground drinking water supply pipe has burst. Clean water is bubbling out like a fountain and flooding the driveway of adjacent houses.',
        priority: 'Emergency',
        status: 'Verified',
        address: '77 Ocean Drive, Waterfront Sector',
        images: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600'],
        citizen: citizen2._id,
        deptName: 'Water Supply'
      },
      {
        title: 'Dangerous Cable Hanging from Electric Pole',
        department: 'Electricity',
        description: 'A black high-voltage cable has snapped off and is hanging low, hovering just 5 feet above the pedestrian walkway. Extremely hazardous, especially if it rains.',
        priority: 'Emergency',
        status: 'Assigned',
        address: '15 High Volt Street, East Grid',
        images: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=600'],
        citizen: citizen2._id,
        workerName: 'Charlie Green',
        deptName: 'Electricity'
      },
      {
        title: 'Broken Traffic Light causing Near-Miss Crashes',
        department: 'Traffic Management',
        description: 'The traffic signal light is frozen on green for both lanes, leading to chaotic near-miss accidents at the cross-over. Police intervention needed immediately.',
        priority: 'High',
        status: 'Pending',
        address: 'Busiest Crossways, Commercial Sector 5',
        images: ['https://images.unsplash.com/photo-1510985220349-43c3f251de4a?auto=format&fit=crop&q=80&w=600'],
        citizen: citizen2._id,
        deptName: 'Traffic Management'
      }
    ];

    for (const c of complaintsDataList) {
      const dept = departments.find(d => d.name === c.deptName);
      const worker = c.workerName ? workers.find(w => w.name === c.workerName) : null;
      
      const createdComplaint = await Complaint.create({
        title: c.title,
        department: c.department,
        description: c.description,
        priority: c.priority,
        status: c.status,
        address: c.address,
        images: c.images,
        citizen: c.citizen,
        assignedDepartment: dept ? dept._id : null,
        assignedWorker: worker ? worker._id : null,
        timeline: [
          {
            status: 'Pending',
            title: 'Complaint Registered',
            description: 'Complaint successfully filed by the citizen.',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3) // 3 days ago
          },
          ...(c.status !== 'Pending' ? [{
            status: 'Verified',
            title: 'Complaint Verified',
            description: 'Civic staff checked and validated the issue.',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2)
          }] : []),
          ...(c.status === 'Assigned' || c.status === 'In Progress' || c.status === 'Resolved' ? [{
            status: 'Assigned',
            title: 'Worker Assigned',
            description: `Assigned to worker ${c.workerName || 'Staff'}.`,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1.5)
          }] : []),
          ...(c.status === 'In Progress' || c.status === 'Resolved' ? [{
            status: 'In Progress',
            title: 'Work In Progress',
            description: 'Worker has started addressing the complaint on site.',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1)
          }] : []),
          ...(c.status === 'Resolved' ? [{
            status: 'Resolved',
            title: 'Complaint Resolved',
            description: 'Issue solved. The worker completed the tasks.',
            createdAt: new Date()
          }] : [])
        ]
      });

      // Update department statistics
      if (dept) {
        dept.stats.totalComplaints += 1;
        if (c.status === 'Resolved') {
          dept.stats.resolvedComplaints += 1;
        }
        await dept.save();
      }
    }

    // Create some initial notifications
    await Notification.create({
      user: adminUser._id,
      message: 'New Emergency Complaint registered at 77 Ocean Drive',
      read: false,
      link: '/admin/complaints'
    });

    await Notification.create({
      user: adminUser._id,
      message: 'Complaint #15 High Volt Street has been assigned to worker Charlie Green',
      read: true,
      link: '/admin/complaints'
    });

    console.log('✅ Base Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding error:', error);
    process.exit(1);
  }
};

seed();
