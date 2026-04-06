export default function Loading() {
  return (
    <div className="_main_layout" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      backgroundColor: '#F0F2F5' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner-lg"></div>
        <p style={{ marginTop: '20px', color: '#65676B', fontWeight: '500' }}>Loading your feed...</p>
      </div>
    </div>
  );
}
