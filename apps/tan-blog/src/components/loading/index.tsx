import styles from './loading.module.css'

const Loading = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className={styles.loader}>
        <div className={`${styles.inner} ${styles.one}`}></div>
        <div className={`${styles.inner} ${styles.two}`}></div>
        <div className={`${styles.inner} ${styles.three}`}></div>
      </div>
    </div>
  )
}

export default Loading
