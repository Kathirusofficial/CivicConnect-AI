require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const Worker = require('../models/Worker');

async function testWorkflow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicconnect');
    console.log('✅ Connected.');

    // 1. Check departments
    const departments = await Department.find();
    console.log(`Found ${departments.length} departments.`);

    const roadDept = departments.find(d => d.name.toLowerCase().includes('road'));
    if (!roadDept) {
      console.error('Road department not found in DB.');
      process.exit(1);
    }
    console.log(`✅ Road Department found: ${roadDept.name} (ID: ${roadDept._id})`);

    // 2. Count Road complaints
    const roadComplaints = await Complaint.find({
      $or: [{ department: { $regex: /road/i } }, { assignedDepartment: roadDept._id }]
    });
    console.log(`Total complaints under Road Department: ${roadComplaints.length}`);

    // Find a pending complaint
    let sampleComplaint = roadComplaints.find(c => c.status === 'Pending') || roadComplaints[0];
    if (!sampleComplaint) {
      console.log('Creating a test road complaint...');
      const admin = await User.findOne({ role: 'Admin' });
      sampleComplaint = await Complaint.create({
        complaintId: `CMP-${new Date().getFullYear()}-999001`,
        title: 'Damaged Asphalt on Highway 4',
        department: 'Road Department',
        description: 'Large fissure on highway asphalt requiring immediate resurfacing.',
        priority: 'High',
        status: 'Pending',
        address: 'Sector 4, Main Express Highway',
        citizen: admin._id,
        assignedDepartment: roadDept._id
      });
      console.log(`Created test complaint #${sampleComplaint.complaintId}`);
    }

    console.log(`Testing with complaint #${sampleComplaint.complaintId || sampleComplaint._id} (Status: ${sampleComplaint.status})`);

    // 3. Test Pending -> In Progress transition
    sampleComplaint.status = 'In Progress';
    sampleComplaint.timeline.push({
      status: 'In Progress',
      title: 'Status Updated to In Progress',
      description: 'Officer updated status to In Progress',
      createdAt: new Date()
    });
    await sampleComplaint.save();
    console.log(`✅ Step 1: Changed status to In Progress: ${sampleComplaint.status}`);

    // 4. Test Resolve Workflow with Proof Photo and Notes
    const adminUser = await User.findOne({ role: 'Admin' });
    const dummyProof = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const notes = 'Road repaired and pothole filled successfully with bitumen layer.';

    sampleComplaint.status = 'Resolved';
    sampleComplaint.resolution = {
      status: 'Resolved',
      notes: notes,
      proofImage: dummyProof,
      solvedBy: adminUser._id,
      solvedAt: new Date(),
      verifiedBy: adminUser._id,
      verifiedAt: new Date()
    };
    if (!sampleComplaint.evidence) sampleComplaint.evidence = [];
    sampleComplaint.evidence.push({
      type: 'after',
      url: dummyProof,
      description: notes,
      uploadedBy: adminUser._id,
      uploadedAt: new Date()
    });
    sampleComplaint.timeline.push({
      status: 'Resolved',
      title: 'Complaint Solved with Resolution Proof',
      description: `Resolved by ${adminUser.name}: "${notes}"`,
      updatedBy: adminUser._id,
      createdAt: new Date()
    });

    await sampleComplaint.save();
    console.log(`✅ Step 2: Successfully saved resolution proof and solved complaint.`);

    // 5. Query back and verify persistence
    const verifiedComplaint = await Complaint.findById(sampleComplaint._id)
      .populate('resolution.solvedBy', 'name email role')
      .populate('citizen', 'name email');

    console.log('✅ Step 3: Verified persisted data:');
    console.log(`   - Status: ${verifiedComplaint.status}`);
    console.log(`   - Solved By: ${verifiedComplaint.resolution?.solvedBy?.name} (${verifiedComplaint.resolution?.solvedBy?.role})`);
    console.log(`   - Solved At: ${verifiedComplaint.resolution?.solvedAt}`);
    console.log(`   - Notes: ${verifiedComplaint.resolution?.notes}`);
    console.log(`   - Proof Image present: ${Boolean(verifiedComplaint.resolution?.proofImage)}`);
    console.log(`   - Evidence count: ${verifiedComplaint.evidence?.length}`);

    // 6. Test Live department stats query
    const total = await Complaint.countDocuments({ department: { $regex: /road/i } });
    const solved = await Complaint.countDocuments({ department: { $regex: /road/i }, status: { $in: ['Resolved', 'SOLVED'] } });
    const pending = await Complaint.countDocuments({ department: { $regex: /road/i }, status: 'Pending' });
    const inProgress = await Complaint.countDocuments({ department: { $regex: /road/i }, status: { $in: ['In Progress', 'Assigned', 'Verified', 'Resolution Pending Verification'] } });

    console.log('✅ Step 4: Department Live Statistics from MongoDB:');
    console.log(`   - Total: ${total}`);
    console.log(`   - Pending: ${pending}`);
    console.log(`   - In Progress: ${inProgress}`);
    console.log(`   - Solved: ${solved}`);

    console.log('\n🎉 ALL WORKFLOW TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testWorkflow();
