export function AdminHeader() {
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <div className="w-full flex-1">
                {/* Breadcrumbs or Search could go here */}
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Admin User</span>
                <div className="h-8 w-8 rounded-full bg-primary/20"></div>
            </div>
        </header>
    );
}
