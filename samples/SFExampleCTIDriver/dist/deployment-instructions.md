# 📋 **Detailed Deployment Instructions**

## 🎯 **Prerequisites**

Before deploying the CTI driver, ensure you have:

- ✅ **Salesforce Lightning Experience** enabled
- ✅ **System Administrator** or **Customize Application** permissions
- ✅ **Call Center license** in your Salesforce org
- ✅ **Dynamics 365 Contact Center** environment ready
- ✅ **Custom fields** created on Case object

---

## 📂 **Step 1: Create Required Salesforce Fields**

### **Case Object Custom Fields:**

```sql
-- Navigate to: Setup → Object Manager → Case → Fields & Relationships → New

1. Call_Start_Time__c
   - Data Type: Date/Time
   - Field Label: Call Start Time
   - API Name: Call_Start_Time__c
   - Required: No
   - Default Value: (blank)

2. Call_End_Time__c
   - Data Type: Date/Time  
   - Field Label: Call End Time
   - API Name: Call_End_Time__c
   - Required: No
   - Default Value: (blank)

3. Call_Duration__c (Optional)
   - Data Type: Number
   - Field Label: Call Duration (seconds)
   - API Name: Call_Duration__c
   - Length: 10
   - Decimal Places: 0
```

### **Add Fields to Page Layouts:**

1. **Setup → Object Manager → Case → Page Layouts**
2. **Edit** your Case page layout
3. **Drag** the new fields to appropriate sections
4. **Save** the layout

---

## 🌐 **Step 2: Host the CTI Driver JavaScript**

### **Option A: Salesforce Static Resources (Recommended)**

1. **Setup → Custom Code → Static Resources → New**
2. **Configure Static Resource:**
   ```
   Name: CTIDriver
   File: Upload SFExampleCTIDriver.js
   Cache Control: Public
   ```
3. **Save** the static resource
4. **Note the URL**: `/resource/CTIDriver/SFExampleCTIDriver.js`

### **Option B: External Web Server**

1. **Upload** `SFExampleCTIDriver.js` to your web server
2. **Ensure HTTPS** is enabled
3. **Configure CORS headers:**
   ```
   Access-Control-Allow-Origin: https://*.salesforce.com
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type
   ```
4. **Test URL accessibility** from Salesforce

---

## 🏢 **Step 3: Configure Call Center**

### **Import Call Center Definition:**

1. **Setup → Apps → App Manager → Call Centers**
2. **Click "Import"**
3. **Upload** `call-center-definition.xml`
4. **Review** and modify settings as needed

### **Update CTI Adapter URL:**

1. **Edit** the imported Call Center
2. **Find** "CTI Adapter URL" setting
3. **Update** with your actual URL:
   - Static Resource: `https://yourorg.salesforce.com/resource/CTIDriver/SFExampleCTIDriver.js`
   - External Server: `https://your-server.com/path/SFExampleCTIDriver.js`

### **Configure Call Center Settings:**

```xml
Key Settings to Verify:
- Softphone Height: 300px
- Softphone Width: 350px
- Salesforce Compatibility Mode: Lightning
- Enable API: true
- Enable Click-to-Dial: true
- Enable Screen Pop: true
```

---

## 👥 **Step 4: Assign Users to Call Center**

### **Method 1: Individual User Assignment**

1. **Setup → Users → Manage Users → Users**
2. **Edit** each user who needs CTI access
3. **Call Center section:**
   - Call Center: Select your D365 Call Center
   - Extension: User's phone extension (if applicable)
4. **Save** user settings

### **Method 2: Bulk Assignment (for multiple users)**

1. **Setup → Data → Data Import Wizard**
2. **Create CSV** with user data:
   ```csv
   Id,CallCenterId,Extension
   00536000005NdZJ,01536000000L2ZJ,1001
   00536000005NdZK,01536000000L2ZJ,1002
   ```
3. **Import** user updates

---

## 🔧 **Step 5: Configure Permissions**

### **Permission Sets/Profiles:**

Ensure users have these permissions:

```
Object Permissions:
- Case: Read, Create, Edit
- Activity: Read, Create, Edit
- Contact: Read
- Account: Read

System Permissions:
- Use CTI
- API Enabled
- Run Apex
```

### **Call Center Permissions:**

1. **Setup → Permission Sets**
2. **Create** "D365 CTI Users" permission set
3. **Add permissions** listed above
4. **Assign** to CTI users

---

## 🧪 **Step 6: Initial Testing**

### **Test CTI Panel Loading:**

1. **Login** as CTI user
2. **Navigate** to any Salesforce page
3. **Look for** softphone panel (usually in utility bar)
4. **Check** browser console for errors

### **Test Basic Functions:**

```
✅ Softphone panel appears
✅ Panel can be resized
✅ Click-to-dial works on phone numbers
✅ No JavaScript errors in console
```

---

## 🔍 **Step 7: Verify D365 Integration**

### **Configure D365 Contact Center:**

1. **Open** D365 Contact Center admin
2. **Configure** CTI provider settings
3. **Set** Salesforce CTI endpoint
4. **Test** agent presence sync

### **Test Call Flow:**

```
1. Agent logs into D365 Contact Center
2. Agent becomes available
3. Customer calls
4. Agent accepts call → Call start time recorded
5. Agent handles customer → Case created/updated
6. Agent ends call → Call end time recorded
7. Call log saved to Salesforce
```

---

## 🚨 **Troubleshooting**

### **Common Issues:**

| **Issue** | **Solution** |
|-----------|-------------|
| Softphone panel not loading | Check CTI Adapter URL and CORS settings |
| JavaScript errors | Verify static resource upload and browser compatibility |
| Screen pop not working | Check user permissions and Call Center settings |
| Call times not recording | Verify custom fields exist and Apex permissions |

### **Debug Steps:**

1. **Browser Console:** Check for JavaScript errors
2. **Network Tab:** Verify resource loading
3. **Salesforce Debug Logs:** Check Apex execution
4. **Call Center Settings:** Verify configuration

---

## 📊 **Step 8: Production Rollout**

### **Pilot Phase:**

1. **Select** 5-10 pilot users
2. **Deploy** to pilot group first
3. **Monitor** for 1-2 weeks
4. **Collect** feedback and issues

### **Full Deployment:**

1. **Address** pilot feedback
2. **Update** documentation
3. **Train** all CTI users
4. **Deploy** to production users
5. **Monitor** and support

---

## 📈 **Step 9: Monitoring & Maintenance**

### **Regular Monitoring:**

- **Check** call logging accuracy
- **Monitor** system performance
- **Review** user feedback
- **Update** documentation

### **Maintenance Tasks:**

- **Update** CTI driver when D365 changes
- **Refresh** Salesforce static resources
- **Review** and update permissions
- **Backup** Call Center configuration

---

**🎉 Your D365-Salesforce CTI integration with call time tracking is now deployed!**
