'use client';
import {
  Flex,
  Box,
  Text,
  Separator,
  IconButton,
  Button,
  ScrollArea,
  Theme,
} from "@radix-ui/themes";
import Image from "next/image";
import Link from "next/link";
import { title } from "process";
import { useState, useEffect } from "react";
import { FaSignOutAlt, FaTimes } from "react-icons/fa";
import { FaChevronDown } from "react-icons/fa6";
import { useAuth } from "../../context/AuthContext";




const Sidebar = ({ isOpen, onClose }) => {
  const [openTabs, setOpenTabs] = useState({});

  const toggleTab = (title) => {
    setOpenTabs((prev) => ({ ...prev, [title]: !prev[title] }));
  };


const [navItems, setNavItems] = useState([]); // Initialize with an empty array
const superadminNavItems = [
  { title: "Dashboard", path: "/admin/" },
  {
    title: "Schools List",
    path: "/school-list",
    
  },
  

  {
    title: "School Inspections",
    path: "/school-inspections",
    subTabs :[
      {title:"All Inspections", path:"/school-inspections"},
      {title:"New Inspection", path:"/school-inspections/new"},
    ]
    
  },
  {
    title: "Appraisals Form",
    path: "/appraisals",
    
  },
  
];
const teacherReportItem = {
  title: "Teacher Report",
  path: "/teacher-report",
};

const adminNavItems = [

  {
    title: "School Inspections",
    path: "/school-inspections",
    subTabs :[
      {title:"All Inspections", path:"/school-inspections"},
      {title:"New Inspection", path:"/school-inspections/new"},
    ]
    
  },
  {
    title: "Teacher Appraisals", // Admin can see reports
    path: "/teacher-reports",
    subTabs :[
      {title:"All ", path:"/teacher-reports"},
      {title:"New ", path:"/teacher-reports/new"},
    ]
  },
  
];
const userNavItems = [
  {
    title: "Teacher Appraisals", // Admin can see reports
    path: "/teacher-reports",
    subTabs :[
      {title:"All ", path:"/teacher-reports"},
      {title:"New ", path:"/teacher-reports/new"},
    ]
  },
  
];

const { user, logout } = useAuth();

useEffect(() => {
  if (user?.role === "superadmin") {
    setNavItems(superadminNavItems);
  } else if (user?.role === "school") {
    setNavItems(adminNavItems);
  } else if (user) { // Check if user exists to set userNavItems
    setNavItems(userNavItems);
  }
}, [user]); // This effect runs when the user object changes


  return (
    <Box
      style={{
        width: isOpen ? "240px" : "0px",
        background: "#f8f9fa",
        height: "100vh",
        overflow: "visible", // Changed to visible to allow button to show
        transition: "all 0.3s ease",
        position: "fixed",
        top: 0,
        left: 0,
        borderRight: "1px solid #ddd",
        zIndex: 50,
      }}
    >
      <Flex justify="between" align="center" style={{ padding: "1rem" }}>
        <Image
          src={"/assets/logos/logo.png"}
          alt={"logo"}
          width={40}
          height={40}
          style={{ margin: "auto" }}

        />

        <IconButton size="2" onClick={onClose} variant="ghost">
          <FaTimes />
        </IconButton>
      </Flex>

      <Separator />

      <ScrollArea type="auto" style={{ height: "calc(100vh - 60px)" }}>
        <Box style={{ padding: "1rem" }}>
          {navItems.map((item, idx) => (
            <Box key={idx} style={{ marginBottom: "1rem" }}>
              {!item.subTabs ? (
                <Link href={item.path}>
                  <Flex
                    align="center"
                    justify="between"
                    onClick={() => item.subTabs && toggleTab(item.title)}
                    style={{
                      cursor: "pointer",
                      fontWeight: "500",
                      fontSize: "16px",
                    }}
                  >
                    <Text>{item.title}</Text>
                    {item.subTabs && <FaChevronDown size={12} />}
                  </Flex>
                </Link>
              ) : (
                <Flex
                  align="center"
                  justify="between"
                  onClick={() => item.subTabs && toggleTab(item.title)}
                  style={{
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "16px",
                  }}
                >
                  <Text>{item.title}</Text>
                  {item.subTabs && <FaChevronDown size={12} />}
                </Flex>

              )}

              {item.subTabs && openTabs[item.title] && (
                <Box style={{ marginLeft: "1rem", marginTop: "0.5rem" }}>
                  {item.subTabs.map((sub, sIdx) => (
                    <Link
                      key={sIdx}
                      href={sub.path}
                    >
                      <Text
                        as="a"
                        href={sub.path}
                        key={sIdx}
                        style={{
                          display: "block",
                          fontSize: "14px",
                          color: "#555",
                          margin: "0.25rem 0",
                        }}
                      >
                        {sub.title}
                        
                      </Text>
                    </Link>
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </ScrollArea>

      <Box
        style={{
          position: "absolute",
          bottom: "1rem",
          width: "100%",
          padding: "0 1rem",
          boxSizing: "border-box",
        }}
      >
        <Button onClick={logout} style={{ width: "100%", cursor: "pointer" }} color="red" variant="soft">
          <FaSignOutAlt />
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default Sidebar;