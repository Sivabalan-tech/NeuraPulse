import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Users, Calendar, UserPlus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, doctors: 0, appointments: 0 });
    const [users, setUsers] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    // Doctor Form State
    const [docName, setDocName] = useState("");
    const [docSpecialty, setDocSpecialty] = useState("");
    const [docAvailability, setDocAvailability] = useState("9:00 AM - 5:00 PM");

    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const role = api.getRole();
        if (role !== 'admin') {
            toast({ title: "Access Denied", description: "You are not authorized to view this page.", variant: "destructive" });
            navigate("/dashboard");
            return;
        }

        loadData();
    }, [navigate]);

    const loadData = async () => {
        try {
            const statsData = await api.get<any>("/admin/stats");
            setStats(statsData);

            const usersData = await api.get<any[]>("/admin/users");
            setUsers(usersData);

            const doctorsData = await api.get<any[]>("/doctors");
            setDoctors(doctorsData);

            const appointmentsData = await api.get<any[]>("/appointments");
            setAppointments(appointmentsData);
        } catch (error) {
            console.error("Failed to load admin data", error);
        }
    };

    const handleAddDoctor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/doctors", {
                name: docName,
                specialty: docSpecialty,
                availability: docAvailability
            });
            toast({ title: "Success", description: "Doctor added successfully" });
            setDocName("");
            setDocSpecialty("");
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "Failed to add doctor", variant: "destructive" });
        }
    };

    const handleDeleteDoctor = async (id: string) => {
        try {
            await api.delete(`/doctors/${id}`);
            toast({ title: "Deleted", description: "Doctor removed" });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete doctor", variant: "destructive" });
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await api.put(`/appointments/${id}/status`, { status });
            toast({ title: "Updated", description: `Appointment ${status}` });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Admin Dashboard
                </h1>
                <Button variant="outline" onClick={() => {
                    api.clearToken();
                    api.clearRole();
                    navigate("/auth");
                }}>Logout</Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.users}</div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.doctors}</div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.appointments}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="users" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="doctors">Manage Doctors</TabsTrigger>
                    <TabsTrigger value="appointments">Appointments</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Registered Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>{user.full_name || "N/A"}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell className="capitalize">{user.role || "user"}</TableCell>
                                            <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="doctors">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Add New Doctor</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddDoctor} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Doctor Name</Label>
                                        <Input value={docName} onChange={e => setDocName(e.target.value)} required placeholder="Dr. Smith" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Specialty</Label>
                                        <Input value={docSpecialty} onChange={e => setDocSpecialty(e.target.value)} required placeholder="Cardiology" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Availability</Label>
                                        <Input value={docAvailability} onChange={e => setDocAvailability(e.target.value)} placeholder="9:00 AM - 5:00 PM" />
                                    </div>
                                    <Button type="submit" className="w-full">
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Add Doctor
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Existing Doctors</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {doctors.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                                            <div>
                                                <p className="font-medium">{doc.name}</p>
                                                <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDoctor(doc.id)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="appointments">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Manage Appointments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Patient</TableHead>
                                        <TableHead>Doctor</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {appointments.map((appt) => (
                                        <TableRow key={appt.id}>
                                            <TableCell>{appt.user_id}</TableCell>
                                            <TableCell>{appt.doctor_name}</TableCell>
                                            <TableCell>{new Date(appt.appointment_date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs capitalize ${appt.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    appt.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {appt.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {appt.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => handleUpdateStatus(appt.id, 'approved')}>
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleUpdateStatus(appt.id, 'rejected')}>
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminDashboard;
