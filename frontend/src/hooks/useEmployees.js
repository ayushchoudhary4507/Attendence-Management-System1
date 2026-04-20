import { useState, useEffect, useCallback } from 'react';

const API_URL = 'http://localhost:5002/api';

export const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selected, setSelected] = useState([]);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        const transformed = data.data.map(emp => ({
          id: emp.employeeId,
          _id: emp._id,
          name: emp.name,
          designation: emp.designation,
          email: emp.email,
          role: emp.role,
          reportingTo: emp.reportingTo,
          status: emp.status
        }));
        setEmployees(transformed);
      } else {
        setError(data.message || 'Failed to fetch');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    let filtered = employees;
    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.id.includes(searchTerm)
      );
    }
    if (roleFilter !== 'All') {
      filtered = filtered.filter(e => e.role === roleFilter);
    }
    setFilteredEmployees(filtered);
  }, [searchTerm, roleFilter, employees]);

  const addEmployee = async (newEmp) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newEmp)
    });
    const data = await res.json();
    if (data.success) {
      await fetchEmployees();
      return { success: true };
    }
    return { success: false, message: data.message };
  };

  const inviteEmployee = async (inviteData) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/employees/invite`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(inviteData)
    });
    const data = await res.json();
    return data;
  };

  const deleteEmployee = async (id) => {
    console.log('Deleting employee with ID:', id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      console.log('Delete response:', data);
      if (data.success) {
        await fetchEmployees();
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err) {
      console.error('Delete error:', err);
      return { success: false, message: err.message };
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['ID', 'Name', 'Designation', 'Email', 'Role', 'Reporting To', 'Status'].join(','),
      ...employees.map(e => [e.id, e.name, e.designation, e.email, e.role, e.reportingTo, e.status].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) 
      ? prev.filter(x => x !== id) 
      : [...prev, id]
    );
  };

  const toggleSelectAll = (checked) => {
    setSelected(checked ? filteredEmployees.map(e => e.id) : []);
  };

  return {
    employees, filteredEmployees, loading, error, searchTerm, setSearchTerm,
    roleFilter, setRoleFilter, selected, toggleSelect, toggleSelectAll,
    addEmployee, inviteEmployee, deleteEmployee, exportToCSV, refresh: fetchEmployees
  };
};
