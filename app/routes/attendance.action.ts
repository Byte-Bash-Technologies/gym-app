import { json, type ActionFunction } from "@remix-run/node";
import { supabase } from "~/utils/supabase.server";
import type { AttendanceStatus } from "~/types/attendance";
import { getAuthenticatedUser } from "~/utils/currentUser";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const memberId = formData.get("memberId") as string;
  const facilityId = formData.get("facilityId") as string;
  const date = formData.get("date") as string;
  const status = formData.get("status") as AttendanceStatus || "present";
  const notes = formData.get("notes") as string;
  const action = formData.get("_action");

  // Get the current user for audit fields
  const user=getAuthenticatedUser(request)

  switch (action) {
    case "check-in": {
      // Check if attendance already exists for today
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("member_id", memberId)
        .eq("facility_id", facilityId)
        .eq("date", date)
        .single();

      if (existing) {
        return json(
          { error: "Attendance already marked for this date" },
          { status: 400 }
        );
      }

      // Mark attendance with check-in
      const { error } = await supabase.from("attendance").insert([
        {
          member_id: memberId,
          facility_id: facilityId,
          date: new Date(date).toISOString(),
          status,
          notes,
          check_in_time: new Date().toISOString(),
          created_by: user.id
        },
      ]);

      if (error) {
        return json(
          { error: "Failed to mark attendance" },
          { status: 500 }
        );
      }

      return json({ success: true, message: "Check-in recorded successfully" });
    }

    case "check-out": {
      // Update existing attendance record with check-out time
      const { error } = await supabase
        .from("attendance")
        .update({
          check_out_time: new Date().toISOString(),
          updated_by: user.id
        })
        .eq("member_id", memberId)
        .eq("facility_id", facilityId)
        .eq("date", date);

      if (error) {
        return json(
          { error: "Failed to record check-out" },
          { status: 500 }
        );
      }

      return json({ success: true, message: "Check-out recorded successfully" });
    }

    case "update-status": {
      // Update attendance status
      const { error } = await supabase
        .from("attendance")
        .update({
          status,
          notes,
          updated_by: user.id
        })
        .eq("member_id", memberId)
        .eq("facility_id", facilityId)
        .eq("date", date);

      if (error) {
        return json(
          { error: "Failed to update attendance status" },
          { status: 500 }
        );
      }

      return json({ success: true, message: "Status updated successfully" });
    }

    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
};

