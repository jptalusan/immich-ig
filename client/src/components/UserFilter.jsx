import "./UserFilter.css";

function UserFilter({ users, enabledUserIds, onToggle, onApply }) {
  return (
    <div className="user-filter">
      <div className="user-filter-inner">
        <div className="user-filter-header">
          <span className="user-filter-title">Show photos from</span>
          <button className="user-filter-apply" onClick={onApply}>
            Apply
          </button>
        </div>
        <div className="user-filter-list">
          {users.map((user) => (
            <label key={user.id} className="user-filter-item">
              <input
                type="checkbox"
                checked={enabledUserIds.includes(user.id)}
                onChange={() => onToggle(user.id)}
              />
              <span className="user-filter-name">{user.name}</span>
              {user.email && (
                <span className="user-filter-email">{user.email}</span>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserFilter;
