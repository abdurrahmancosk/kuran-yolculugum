package com.kuranyolculugu.app

import android.app.job.JobParameters
import android.app.job.JobService

/** Günde bir kez çalışan güncelleme denetimi. */
class UpdateJobService : JobService() {
    override fun onStartJob(params: JobParameters): Boolean {
        Thread {
            try { UpdateManager.check(applicationContext, false) } catch (_: Exception) {}
            jobFinished(params, false)
        }.start()
        return true
    }

    override fun onStopJob(params: JobParameters): Boolean = true
}
